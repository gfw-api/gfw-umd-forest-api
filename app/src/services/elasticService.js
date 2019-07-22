'use strict';

let co = require('co');
let request = require('co-request');
const logger = require('logger');
const config = require('config');
const NotFound = require('errors/notFound');
const JSONAPIDeserializer = require('jsonapi-serializer').Deserializer;
const MicroServiceClient = require('vizz.microservice-client');

const getLocationString = ({ iso, adm1, adm2 }) => {
    return `iso = '${iso}' ${adm1 ? `AND adm1 = ${adm1}` : ''} ${adm2 ? `AND adm2 = ${adm2}` : ''}`;
};

const getLocationVars = ({ adm1, adm2 }) => {
    return `iso${adm1 ? `, adm1` : ''}${adm2 ? `, adm2` : ''},`;
};

const YEAR_QUERY = `SELECT {vars} year_data.year as year, SUM(year_data.area_loss) as area_loss, \
                SUM(year_data.carbon_emissions) as emissions, \
                FROM data
                WHERE {location} \
                AND thresh = {threshold}`;

const BASE_QUERY = `SELECT {vars} SUM(total_area) AS area, SUM(total_gain) AS gain, \
                SUM(extent_2000) AS extent2000, SUM(extent_2010) AS extent2010, \
                SUM(weighted_biomass_per_ha) AS biomass_density \
                FROM data
                WHERE {location} \
                AND thresh = {threshold}`;

var deserializer = function (obj) {
    return function (callback) {
        new JSONAPIDeserializer({ keyForAttribute: 'camelCase' }).deserialize(obj, callback);
    };
};

class ElasticService {
    // use this for testing locally
    // static * getData(sql, params) {
    //     sql = sql.replace('{location}', getLocationString(params))
    //              .replace('{vars}', getLocationVars(params))
    //              .replace('{threshold}', params.thresh)
    //     let url = '';
    //     let id = '';
    //     if (params.gadm && params.gadm === '2.8') {
    //         id = config.get('elasticTable.v2');
    //         url = `https://production-api.globalforestwatch.org/v1/query/${id}?sql=`;
    //     } else if (params.gadm && params.gadm === '3.6') {
    //         id = config.get('elasticTable.v3');
    //         url = `https://production-api.globalforestwatch.org/v1/query/${id}?sql=`;
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

    // Use this one for prod/staging
    static* getData(sqlTemplate, params) {
        const sql = sqlTemplate.replace('{location}', getLocationString(params))
            .replace('{vars}', getLocationVars(params))
            .replace('{threshold}', params.thresh)
        logger.debug('Obtaining data with:', sql);
        const tableId = params.gadm === '2.8' ? config.get('elasticTable.v2') : config.get('elasticTable.v3');
        try {
            const result = yield MicroServiceClient.requestToMicroservice({
                uri: `/query/${tableId}?sql=${sql}`,
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

    static sum(a, b) {
        return a + b;
    }

    static getLossTotals(data, key, periods) {
        let loss = data.map(obj => {
            const filteredLoss =
                periods ? obj.loss_data.filter(year => year.year >= periods[0] && year.year <= periods[1])
                    : obj.loss_data;
            let lossTotal = filteredLoss
                .map(year => {
                    return year[key];
                });
            return lossTotal.reduce(ElasticService.sum, 0);
        });
        return loss.reduce(ElasticService.sum, 0);
    }

    static getLossByYear(data, area, periods) {
        let loss = data.map(obj => {
            const filteredLoss =
                periods ? obj.loss_data.filter(year => year.year >= periods[0] && year.year <= periods[1])
                    : obj.loss_data;
            let lossTotal = filteredLoss
                .map(year => {
                    let tmp = {
                        year: year.year,
                        loss: year.area_loss,
                        emissions: year.emissions
                    };
                    return tmp;
                });
            let tmp = {};
            lossTotal.forEach(el => {
                if (!tmp[el.year]) {
                    tmp[el.year] = 0;
                }
                tmp[el.year] += el.value;
                // emissions
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
                    emissions: 0
                    lossPerc: 100 * el[1] / area
                    emissionsPerc: 100 * 0 / area
                };
            });
            return returnData;
        } else {
            return null;
        }
    }

    static getTotals(data, periods) {
        const returnData = {
            extent2000: 0,
            extent2000Perc: 0,
            extent2010: 0,
            extent2010Perc: 0,
            emissions: 0,
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
        returnData.loss = ElasticService.getLossTotals(data, 'area_loss', periods);
        returnData.emissions = ElasticService.getLossTotals(data, 'emissions', periods);
        returnData.extent2000Perc = 100 * returnData.extent2000 / returnData.areaHa;
        returnData.extent2010Perc = 100 * returnData.extent2010 / returnData.areaHa;
        returnData.gainPerc = 100 * returnData.gain / returnData.areaHa;
        returnData.lossPerc = 100 * returnData.loss / returnData.areaHa;
        return returnData;
    }

    * fetchData(params) {
        const base_data = yield ElasticService.getData(BASE_QUERY, params);
        if (!base_data || !base_data.data || base_data.data.length === 0) {
            logger.error('No data found.');
            data = []
        }
        const year_data = yield ElasticService.getData(YEAR_QUERY, params);
        if (!year_data || !year_data.data || year_data.data.length === 0) {
            logger.error('No data found.');
            data = []
        }

        ///// data = parse(base_data + year_data)

        const periodsYears = params.period.length ? [params.period[0].slice(0, 4), params.period[1].slice(0, 4)] : null;
        if (data && Object.keys(data).length > 0) {
            const totals = ElasticService.getTotals(year_data.data, periodsYears);
            const returnData = Object.assign({
                totals,
                years: ElasticService.getLossByYear(data.data, totals.areaHa, periodsYears)
            }, params);
            return returnData;
        }

        return null;
    }
}

module.exports = new ElasticService();
