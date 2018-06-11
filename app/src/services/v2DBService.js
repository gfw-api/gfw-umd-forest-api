'use strict';

let co = require('co');
let request = require('co-request');
const logger = require('logger');
const moment = require('moment');
const config = require('config');
const NotFound = require('errors/notFound');
const InvalidPeriod = require('errors/invalidPeriod');
const JSONAPIDeserializer = require('jsonapi-serializer').Deserializer;
const MicroServiceClient = require('vizz.microservice-client');

const getLocationString = ({ iso, adm1, adm2 }) => {
    return `iso = '${iso}' ${adm1 ? `AND adm1 = ${adm1}`: ''} ${adm2 ? `AND adm2 = ${adm2}`: ''}`;
};

const getLocationVars = ({ adm1, adm2 }) => {
    return `iso${adm1 ? `, adm1`: ''}${adm2 ? `, adm2`: ''},`;
};

const getAreaType = polyname => {
    return `${polyname !== 'gadm28' ? 'area_poly_aoi' : 'area_gadm28'}`;
};

const QUERY = `SELECT {vars} area_extent as extent2010, area_extent_2000 as extent2000, \
                {area_type} as area, year_data as loss_data,area_gain as gain \
                FROM data
                WHERE {location} \
                AND thresh = {threshold} \
                AND polyname = '{polyname}'`;

var deserializer = function(obj) {
    return function(callback) {
        new JSONAPIDeserializer({keyForAttribute: 'camelCase'}).deserialize(obj, callback);
    };
};

class V2DBService {
    // use this for testing locally
    // static * getData(sql, params) {
    //     sql = sql.replace('{location}', getLocationString(params))
    //              .replace('{vars}', getLocationVars(params))
    //              .replace('{threshold}', params.thresh)
    //              .replace('{area_type}', getAreaType(params.polyname))
    //              .replace('{polyname}', params.polyname);
    //
    //     logger.debug('Obtaining data with:', sql);
    //     let result = yield request.get('https://production-api.globalforestwatch.org/v1/query/499682b1-3174-493f-ba1a-368b4636708e?sql='+sql); // move to env
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
                 .replace('{area_type}', getAreaType(params.polyname))
                 .replace('{polyname}', params.polyname);

        logger.debug('Obtaining data with:', sql);
        try {
            let result = yield MicroServiceClient.requestToMicroservice({
                uri: `/query/499682b1-3174-493f-ba1a-368b4636708e?sql=${sql}`,
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
            return lossTotal.reduce(V2DBService.sum,0);
        });
        return loss.reduce(V2DBService.sum,0);
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
        returnData.loss = V2DBService.getLossTotal(data, periods);
        returnData.extent2000Perc = 100 * returnData.extent2000 / returnData.areaHa;
        returnData.extent2010Perc = 100 * returnData.extent2010 / returnData.areaHa;
        returnData.gainPerc = 100 * returnData.gain / returnData.areaHa;
        returnData.lossPerc = 100 * returnData.loss / returnData.areaHa;
        return returnData;
    }

    * fetchData(params) {
        const data = yield V2DBService.getData(QUERY, params);
        if (data.data.length === 0) {
            logger.error('No data found.');
            return [];
        }
        let periods = null;
        if (params.period) {
            const date_format = 'YYYY-MM-DD';
            const dates = params.period.split(',');
            if (!moment(dates[0], date_format, true).isValid() || !moment(dates[1], date_format, true).isValid()) {
                logger.error('Period must be in the format: YYYY-MM-DD,YYYY-MM-DD');
                throw new InvalidPeriod('Period must be in the format: YYYY-MM-DD,YYYY-MM-DD');
            }
            else if (moment(dates[0]).isAfter(moment(dates[1]))) {
                logger.error('Start date must be before end date!');
                throw new InvalidPeriod('Start date must be before end date!');
            }
            else {
                periods = [dates[0].slice(0,4), dates[1].slice(0,4)];
            }
        }

        if (data && Object.keys(data).length > 0) {
            const totals = V2DBService.getTotals(data.data, periods);
            const returnData = Object.assign({
                totals,
                years: V2DBService.getLossByYear(data.data, totals.areaHa, periods)
            }, params);
            return returnData;
        }
        else { return null; } //error message for cases where data.data =[]
    }
}

module.exports = new V2DBService();
