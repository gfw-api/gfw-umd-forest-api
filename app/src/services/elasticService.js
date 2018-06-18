'use strict';

let co = require('co');
let request = require('co-request');
const logger = require('logger');
const config = require('config');
const NotFound = require('errors/notFound');
const JSONAPIDeserializer = require('jsonapi-serializer').Deserializer;
const MicroServiceClient = require('vizz.microservice-client');

const getLocationString = ({ iso, adm1, adm2 }) => {
    return `iso = '${iso}' ${adm1 ? `AND adm1 = ${adm1}`: ''} ${adm2 ? `AND adm2 = ${adm2}`: ''}`;
};

const getLocationVars = ({ adm1, adm2 }) => {
    return `iso${adm1 ? `, adm1`: ''}${adm2 ? `, adm2`: ''},`;
};

const getAreaType = ( polyname, version ) => {
    const poly_version = version === '2.8' ? 'gadm28' : 'admin';
    return `${polyname !== `${poly_version}` ? 'area_poly_aoi' : `area_${poly_version}`}`;
};

const QUERY = `SELECT {vars} area_extent AS extent2010, area_extent_2000 AS extent2000, \
                {area_type} AS area, year_data AS loss_data, area_gain AS gain \
                FROM data
                WHERE {location} \
                AND thresh = {threshold} \
                AND polyname = '{polyname}'`;

var deserializer = function(obj) {
    return function(callback) {
        new JSONAPIDeserializer({keyForAttribute: 'camelCase'}).deserialize(obj, callback);
    };
};
class ElasticService {
    // use this for testing locally
    // static * getData(sql, params) {
    //     sql = sql.replace('{location}', getLocationString(params))
    //              .replace('{vars}', getLocationVars(params))
    //              .replace('{threshold}', params.thresh)
    //              .replace('{area_type}', getAreaType(params.polyname, params.gadm))
    //              .replace('{polyname}', params.polyname);
    //     let url = '';
    //     let id = '';
    //     if (params.gadm && params.gadm === '2.8') {
    //         id = config.get('elasticTable.v2');
    //         url = `https://production-api.globalforestwatch.org/v1/query/${id}?sql=`;
    //     } else if (params.gadm && params.gadm === '3.6') {
    //         id = config.get('elasticTable.v3');
    //         url = `https://staging-api.globalforestwatch.org/v1/query/${id}?sql=`;
    //     }
    //     logger.debug('Obtaining data with:', url+sql);
    //     let result = yield request.get(url+sql);
    //     if (result.statusCode !== 200) {
    //         console.error('Error obtaining data:');
    //         console.error(result);
    //         return null;
    //     }
    //     return JSON.parse(result.body);
    // }

    //Use this one for prod/staging
    static * getData(sql, params) {
        sql = sql.replace('{location}', getLocationString(params))
                 .replace('{vars}', getLocationVars(params))
                 .replace('{threshold}', params.thresh)
                 .replace('{area_type}', getAreaType(params.polyname, params.gadm))
                 .replace('{polyname}', params.polyname);
        logger.debug('Obtaining data with:', sql);
        const table_id = params.gadm === '2.8' ? config.get('elasticTable.v2') : config.get('elasticTable.v3');
        try {
            let result = yield MicroServiceClient.requestToMicroservice({
                uri: `/query/${table_id}?sql=${sql}`,
                method: 'GET',
                json: true
            });
            logger.debug(result);
            return result.body;
        } catch (err) {
            logger.error(err);
            throw err;
        }
    }

    static sum (a, b) {
        return a + b;
    }

    static getLossTotal (data, periods) {
        let loss = data.map(obj => {
            const filteredLoss =
                periods ? obj.loss_data.filter(year => year.year >= periods[0] && year.year <= periods[1])
                        : obj.loss_data;
            let lossTotal = filteredLoss
                .map(year => {
                    return year.area_loss;
                });
            return lossTotal.reduce(ElasticService.sum,0);
        });
        return loss.reduce(ElasticService.sum,0);
    }

    static getLossByYear (data, area, periods) {
        let loss = data.map(obj => {
            const filteredLoss =
                periods ? obj.loss_data.filter(year => year.year >= periods[0] && year.year <= periods[1])
                        : obj.loss_data;
            let lossTotal = filteredLoss
                .map(year => {
                    let tmp = {
                        year: year.year,
                        value: year.area_loss
                    };
                    return tmp;
                });
            let tmp = {};
            lossTotal.forEach(el => {
                if (!tmp[el.year]) {
                    tmp[el.year] = 0;
                }
                tmp[el.year] += el.value;
            });
            return tmp;
        });
        let returnData = {};
        let yearKeys = Object.keys(loss[0]);
        if (yearKeys && yearKeys.length > 0) {
            yearKeys.forEach(k => {
                if (!returnData[k]) {
                    returnData[k] = 0;
                }
                loss.forEach(el => {
                    returnData[k] += el[k];
                });
            });
            returnData = Object.entries(returnData).map(el => {
                return {
                    year: el[0],
                    loss: el[1],
                    lossPerc: 100 * el[1] / area
                };
            });
        return returnData;
        }
        else { return null; }
    }

    static getTotals (data, periods) {
        const returnData = {
            extent2000: 0,
            extent2000Perc: 0,
            extent2010: 0,
            extent2010Perc: 0,
            gain: 0,
            gainPerc: 0,
            loss: 0,
            lossPerc: 0,
            areaHa: 0
        };

        data.forEach(d => {
            returnData.extent2000 += d.extent2000;
            returnData.extent2010 += d.extent2010;
            returnData.gain += d.gain;
            returnData.areaHa += d.area;
        });
        returnData.loss = ElasticService.getLossTotal(data, periods);
        returnData.extent2000Perc = 100 * returnData.extent2000 / returnData.areaHa;
        returnData.extent2010Perc = 100 * returnData.extent2010 / returnData.areaHa;
        returnData.gainPerc = 100 * returnData.gain / returnData.areaHa;
        returnData.lossPerc = 100 * returnData.loss / returnData.areaHa;
        return returnData;
    }

    * fetchData(params) {
        const data = yield ElasticService.getData(QUERY, params);
        if (!data || !data.data || data.data.length === 0) {
            logger.error('No data found.');
            return [];
        }
        const periodsYears = params.period.length ? [params.period[0].slice(0,4), params.period[1].slice(0,4)] : null;
        if (data && Object.keys(data).length > 0) {
            const totals = ElasticService.getTotals(data.data, periodsYears);
            const returnData = Object.assign({
                totals,
                years: ElasticService.getLossByYear(data.data, totals.areaHa, periodsYears)
            }, params);
            const tmp = [];
            return returnData;
        }
        else { return null; } //error message for cases where data.data =[]
    }
}

module.exports = new ElasticService();
