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

const QUERY = `SELECT {vars} area_extent as extent2010, area_extent_2000 as extent2000, \
                area_gadm28 as area, year_data as loss_data,area_gain as gain \
                FROM data 
                WHERE {location} \
                AND thresh = {threshold} \
                AND polyname = 'gadm28'`;

var deserializer = function(obj) {
    return function(callback) {
        new JSONAPIDeserializer({keyForAttribute: 'camelCase'}).deserialize(obj, callback);
    };
};

class V2DBService {
    //use this for testing locally
    static * getData(sql, params) {
        sql = sql.replace('{location}', getLocationString(params))
                 .replace('{vars}', getLocationVars(params))
                 .replace('{threshold}', params.thresh);
                    
        logger.debug('Obtaining data with:', sql);
        let result = yield request.get('https://production-api.globalforestwatch.org/v1/query/499682b1-3174-493f-ba1a-368b4636708e?sql='+sql); // move to env
        if (result.statusCode !== 200) {
            console.error('Error obtaining data:');
            console.error(result);
            return null;
        }
        return JSON.parse(result.body);
    }

    // //Use this one for prod/staging
    // static * getData(sql, params) {
    //     sql = sql.replace('{iso}', params.iso)
    //              .replace('{adm1}', params.adm1)
    //              .replace('{threshold}', params.threshold)
    //              .replace('{ds}', DS);
                    

    //     logger.debug('Obtaining data with:', sql);
    //     let result = yield MicroServiceClient.requestToMicroservice({
    //         uri: '/query/499682b1-3174-493f-ba1a-368b4636708e',
    //         params: {sql: sql},
    //         method: 'GET',
    //         json: true
    //     });
    //     if (result.statusCode !== 200) {
    //         console.error('Error obtaining data:');
    //         console.error(result);
    //         return null;
    //     }
    //     logger.debug('Data:', result);
    //     return true;
    //     //return yield deserializer(result.body);
    // }

    static sum (a, b) {
        return a + b;
    }

    static getLossTotal (data) {
        let loss = data.map(obj => {
            let lossTotal = obj.loss_data.map(year => {
                return year.area_loss;
            });
            return lossTotal.reduce(V2DBService.sum,0);
        });
        return loss.reduce(V2DBService.sum,0);
    }

    static getLossByYear (data, area) {
        let loss = data.map(obj => {
            let lossTotal = obj.loss_data.map(year => {
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

    static getTotals (data) {
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
        returnData.loss = V2DBService.getLossTotal(data);
        returnData.extent2000Perc = 100 * returnData.extent2000 / returnData.areaHa;
        returnData.extent2010Perc = 100 * returnData.extent2010 / returnData.areaHa;
        returnData.gainPerc = 100 * returnData.gain / returnData.areaHa;
        returnData.lossPerc = 100 * returnData.loss / returnData.areaHa;
        return returnData;
    }

    * fetchData(params) {
        const data = yield V2DBService.getData(QUERY, params);
        if (data && Object.keys(data).length > 0) {
            const totals = V2DBService.getTotals(data.data);
            const returnData = Object.assign({
                totals,
                years: V2DBService.getLossByYear(data.data, totals.areaHa)
            }, params);
            return returnData;
        }
        else { return null; }
    }
}

module.exports = new V2DBService();
