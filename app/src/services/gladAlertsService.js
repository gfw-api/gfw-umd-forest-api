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

const getLocationVars = ({ iso, adm1 }) => {
    return adm1 ? `${iso}/${adm1}` : `${iso}`;
};

const GLAD_URL = '/glad-alerts/admin/{location}{period}{threshold}';

class GladAlertsService {
    // use this for testing locally
    // static * getData(url, params) {
    //     url = url.replace('{location}', getLocationVars(params))
    //              .replace('{period}', `?period=${params.period}`)
    //              .replace('{threshold}', `&thresh=${params.thresh}`);
    //     const service = params.gadm === '2.8' ? 'v2/' : 'v3/';    
    //     logger.debug('Obtaining data with:', url);
    //     let result = yield request.get(service + url); // move to env
    //     if (result.statusCode !== 200) {
    //         console.error('Error obtaining data:');
    //         console.error(result);
    //         return null;
    //     }
    //     return JSON.parse(result.body);
    // }

    //Use this one for prod/staging
    static * getData(url, params) {
        url = url.replace('{location}', getLocationVars(params))
                 .replace('{period}', `?period=${params.period}`)
                 .replace('{threshold}', `&thresh=${params.thresh}`);
        const service = params.gadm === '2.8' ? 'v2/' : 'v3/';
        logger.debug('Obtaining data');
        try {
            let result = yield MicroServiceClient.requestToMicroservice({
                uri: service + url,
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

    * fetchData(params) {
        const dates = params.period;

        if (moment(dates[0]).isBefore('2015-01-01')) {
            params.period = '2015-01-01,'.concat(dates[1]);
            logger.debug(params.period);
        }
        else {
            params.period = dates.join(',');
        }

        const data = yield GladAlertsService.getData(GLAD_URL, params);
        
        if (data && data.data) {
            return data.data.attributes.value || 0;
        }
        else { 
            logger.error('No GLAD data found.');
            return null;
        } //error message for cases where data.data =[]
    }
}

module.exports = new GladAlertsService();
