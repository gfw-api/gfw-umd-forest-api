'use strict';

var logger = require('logger');
var path = require('path');
var config = require('config');
var PythonShell = require('python-shell');
var NotFound = require('errors/notFound');
var JSONAPIDeserializer = require('jsonapi-serializer').Deserializer;
var fs = require('fs');
var cartoDBService = require('services/cartoDBService');
var TMP_PATH = '/tmp';

var deserializer = function(obj){
    return function(callback){
        new JSONAPIDeserializer({keyForAttribute: 'camelCase'}).deserialize(obj, callback);
    };
};


var pythonRun = function(script, options) {
    return function(callback) {
        PythonShell.run(script, options, callback);
    };
};

class GeeService {

    static * executePython(thresh, geojson, period) {
        logger.debug('Executing gee (python code)');
        let threshold = thresh || 30;
        period = period || '2001-01-01,2013-01-01';
        let periods = period.split(',');
        let options = {
            mode: 'json',
            scriptPath: path.resolve(__dirname, 'python'),
            args: [threshold, geojson, periods[0], periods[1]]
        };
        return yield pythonRun('umd.py', options);
    }

    static * getGeostore(hashGeoStore) {
        let result = yield require('microservice-client').requestToMicroservice({
            uri: '/geostore/' + hashGeoStore,
            method: 'GET',
            json: true
        });
        if (result.statusCode !== 200) {
            console.error('Error obtaining geostore:');
            console.error(result);
            return null;
        }
        return yield deserializer(result.body);
    }

    static * getWorld(hashGeoJson, period, thresh) {
        logger.debug('Obtaining geojson');
        let geostore = yield GeeService.getGeostore(hashGeoJson);
        logger.debug('Geostore obtained', JSON.stringify(geostore.geojson));
        logger.debug('Writting geojson to file');
        fs.writeFileSync(TMP_PATH + '/world-' + hashGeoJson, JSON.stringify(geostore.geojson));
        try {

            let result = yield GeeService.executePython(thresh, TMP_PATH + '/world-' + hashGeoJson, period);
            if (result && result.length >= 1) {
                return result[0];
            }
        } catch (e) {
            logger.error(e);
            throw e;
        } finally {
            logger.debug('Deleting file');
            fs.unlinkSync(TMP_PATH + '/world-' + hashGeoJson);
        }

    }

    static * getUse(useTable, id, period, thresh) {
        let geojson = yield CartoDBService.getUseGeoJSON(useTable, id);
        logger.debug('Writting geojson to file');
        fs.writeFileSync(TMP_PATH + '/use-' + id, geojson);
        try {

            let result = yield GeeService.executePython(thresh, TMP_PATH + '/use-' + id, period);
            if (result && result.length >= 1) {
                return result[0];
            }
        } catch (e) {
            logger.error(e);
            throw e;
        } finally {
            logger.debug('Deleting file');
            fs.unlinkSync(TMP_PATH + '/use-' + id);
        }
    }

    static * getWdpa(wdpaid, period, thresh) {

        let geojson = yield CartoDBService.getWDPAGeoJSON(wdpaid);
        logger.debug('Writting geojson to file');
        fs.writeFileSync(TMP_PATH + '/wdpa-' + wdpaid, geojson);

        try {
            let result = yield GeeService.executePython(thresh, TMP_PATH + '/wdpa-' + wdpaid, period);
            if (result && result.length >= 1) {
                return result[0];
            }
        } catch (e) {
            logger.error(e);
            throw e;
        } finally {
            logger.debug('Deleting file');
            fs.unlinkSync(TMP_PATH + '/wdpa-' + wdpaid);
        }

    }


}

module.exports = GeeService;
