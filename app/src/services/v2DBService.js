'use strict';

let co = require('co');
let request = require('co-request');
const logger = require('logger');
const config = require('config');
const NotFound = require('errors/notFound');
const JSONAPIDeserializer = require('jsonapi-serializer').Deserializer;
const MicroServiceClient = require('vizz.microservice-client');

const DS = `499682b1-3174-493f-ba1a-368b4636708e`;

const ADM2 = `  SELECT iso, adm1, adm2, area_extent as extent2010, area_extent_2000 as extent2000, \
                area_gadm28 as area, year_data as loss_data,area_gain as gain \
                FROM {ds} 
                WHERE iso = '{iso}' \
                AND adm1 = {adm1} \
                AND adm1 = {adm2} \
                AND thresh = {threshold} \
                AND polyname = 'gadm28'`;

const ADM1 = `  SELECT iso, adm1, area_extent as extent2010, area_extent_2000 as extent2000, \
                area_gadm28 as area, year_data as loss_data,area_gain as gain \
                FROM {ds} \
                WHERE iso = '{iso}' \
                AND adm1 = {adm1} \
                AND thresh = {threshold} \
                AND polyname = 'gadm28'`;

const ISO = `  SELECT iso, area_extent as extent2010, area_extent_2000 as extent2000, \
                area_gadm28 as area, year_data as loss_data,area_gain as gain \
                FROM {ds} 
                WHERE iso = '{iso}' \
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
        sql = sql.replace('{iso}', params.iso)
                 .replace('{adm1}', params.adm1)
                 .replace('{adm2}', params.adm2)
                 .replace('{threshold}', params.threshold)
                 .replace('{ds}', DS);
                    
        logger.debug('Obtaining data with:', sql);
        let result = yield request.get('https://production-api.globalforestwatch.org/v1/query/499682b1-3174-493f-ba1a-368b4636708e?sql='+sql);
        if (result.statusCode !== 200) {
            console.error('Error obtaining geostore:');
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

    * getAdm2(iso, id1, id2, thresh) {
        const data = yield V2DBService.getData(ADM2, {iso: iso, adm1: id1, adm2: id2, threshold: thresh});
        if (data && Object.keys(data).length > 0) {
            let returnData = {};
            returnData.iso = iso.toUpperCase();
            returnData.adm1 = id1;
            returnData.adm2 = id2;
            returnData.thresh = thresh;
            returnData.total = V2DBService.getTotals(data.data);
            returnData.years = V2DBService.getLossByYear(data.data, returnData.total.areaHa);
            return returnData;
        }
        else { return null; }
    }

    * getAdm1(iso, id1, thresh) {
        const data = yield V2DBService.getData(ADM1, {iso: iso, adm1: id1, threshold: thresh});
        if (data && Object.keys(data).length > 0) {
            let returnData = {};
            returnData.iso = iso.toUpperCase();
            returnData.adm1 = id1;
            returnData.thresh = thresh;
            returnData.total = V2DBService.getTotals(data.data);
            returnData.years = V2DBService.getLossByYear(data.data, returnData.total.areaHa);
            return returnData;
        }
        else { return null; }
    }

    * getIso(iso, thresh) {
        const data = yield V2DBService.getData(ISO, {iso: iso, threshold: thresh});
        if (data && Object.keys(data).length > 0) {
            let returnData = {};
            returnData.iso = iso.toUpperCase();
            returnData.thresh = thresh;
            returnData.total = V2DBService.getTotals(data.data);
            returnData.years = V2DBService.getLossByYear(data.data, returnData.total.areaHa);
            return returnData;
        }
        else { return null; }
    }

}

module.exports = new V2DBService();
