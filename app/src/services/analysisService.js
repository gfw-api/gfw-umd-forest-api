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

const getLocationVars = ({ iso, adm1, adm2 }) => {
    return `${iso}${adm1 ? `/${adm1}` : ''}${adm2 ? `/${adm2}`: ''}`;
};


var deserializer = function(obj) {
    return function(callback) {
        new JSONAPIDeserializer({keyForAttribute: 'camelCase'}).deserialize(obj, callback);
    };
};

const GEOSTORE_URL = '/v1/umd-loss-gain?geostore={geostore}&period={period}&thresh={threshold}';

class GladAlertsService {
    // use this for testing locally
    static * getData(url, params) {
        url = 'https://production-api.globalforestwatch.org' + url; 
        url = url.replace('{location}', getLocationVars(params))
                 .replace('{period}', `${params.period}`)
                 .replace('{threshold}', `${params.thresh}`)
                 .replace('{geostore}', `${params.geostore}`);
    
        logger.debug('Obtaining forest data with:', url);
        let result = yield request.get(url); // move to env
        if (result.statusCode !== 200) {
            console.error('Error obtaining data:');
            console.error(result);
            return null;
        }
        return JSON.parse(result.body);
    }

    //Use this one for prod/staging
    // static * getData(url, params) {
    //     url = url.replace('{location}', getLocationVars(params))
    //              .replace('{period}', `?period=${params.period}`)
    //              .replace('{threshold}', `&thresh=${params.thresh}`);

    //     logger.debug('Obtaining data');
    //     try {
    //         let result = yield MicroServiceClient.requestToMicroservice({
    //             uri: url,
    //             method: 'GET',
    //             json: true
    //         });
    //         logger.debug(result);
    //         return result.body;
    //     } catch (err) {
    //         logger.error(err);
    //         throw err;
    //     }
    // }

    * fetchData(params) {
        const date_format = 'YYYY-MM-DD';
        const dates = params.period;

        const data = yield GladAlertsService.getData(GEOSTORE_URL, params);
        
        if (data && data.data) {
            logger.error('Successfully returned custom forest data: ');
            const { areaHa, gain, loss } = data.data.attributes;
            const returnData = {
                totals: {
                    areaHa,
                    gain,
                    loss,
                    extent2000: data.data.attributes.treeExtent,
                    extent2010: data.data.attributes.treeExtent2010
                },
                years: null
            };
            return returnData;
        }
        else { 
            logger.error('No custom forest data found.');
            return null;
        } //error message for cases where data.data =[]
    }
}

module.exports = new GladAlertsService();
