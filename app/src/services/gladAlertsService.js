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

const ADMIN_URL = '/glad-alerts/admin/{location}?period={period}&{threshold}';
const GEOSTORE_URL = '/glad-alerts?geostore={geostore}&period={period}&thresh={threshold}';

class GladAlertsService {
    // use this for testing locally
    static * getData(url, params) {
        url = 'https://production-api.globalforestwatch.org' + url; 
        url = url.replace('{location}', getLocationVars(params))
                 .replace('{period}', `${params.period}`)
                 .replace('{threshold}', `${params.thresh}`)
                 .replace('{geostore}', `${params.geostore}`);
    
        logger.debug('Obtaining data with:', url);
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

        if (moment(dates[0]).isBefore('2015-01-01')) {
            params.period = '2015-01-01,'.concat(dates[1]);
            logger.debug('Fetching glads for period: ', params.period);
        }
        else {
            params.period = dates.join(',');
        }

        const url = params.geostore ? GEOSTORE_URL : ADMIN_URL;
        const data = yield GladAlertsService.getData(url, params);
        
        if (data && data.data) {
            logger.error('Successfully returned GLAD data.');
            return data.data.attributes.value || 0;
        }
        else { 
            logger.error('No GLAD data found.');
            return null;
        } //error message for cases where data.data =[]
    }
}

module.exports = new GladAlertsService();
