'use strict';

var logger = require('logger');
var path = require('path');
var config = require('config');
var PythonShell = require('python-shell');
var NotFound = require('errors/notFound');
var JSONAPIDeserializer = require('jsonapi-serializer').Deserializer;
var fs = require('fs');
var cartoDBService = require('services/cartoDBService');
var crypto = require('crypto');
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
        let result = yield require('vizz.microservice-client').requestToMicroservice({
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
        let nameFile = `${TMP_PATH}/world-${hashGeoJson}-${crypto.randomBytes(20).toString('hex')}`;
        fs.writeFileSync(nameFile, JSON.stringify(geostore.geojson));
        try {

            let result = yield GeeService.executePython(thresh, nameFile, period);
            if (result && result.length >= 1) {
                let data = result[0];
                data.area_ha = geostore.areaHa;
                return data;
            }
        } catch (e) {
            logger.error(e);
            throw e;
        } finally {
            logger.debug('Deleting file');
            try{
                fs.unlinkSync(nameFile);
            }catch(err){
                logger.error(err);
            }
        }

    }

    static * getUse(useTable, id, period, thresh) {
        let useGeo = yield cartoDBService.getUseGeoJSON(useTable, id);
        logger.debug('Writting geojson to file');
        let nameFile = `${TMP_PATH}/use-${id}-${crypto.randomBytes(20).toString('hex')}`;
        fs.writeFileSync(nameFile, useGeo.geojson);
        try {

            let result = yield GeeService.executePython(thresh, nameFile, period);
            if (result && result.length >= 1) {
                let data = result[0];
                data.area_ha = useGeo.area_ha;
                return data;
            }
        } catch (e) {
            logger.error(e);
            throw e;
        } finally {
            logger.debug('Deleting file');
            try{
                fs.unlinkSync(nameFile);
            }catch(err){
                logger.error(err);
            }
        }
    }

    static * getWdpa(wdpaid, period, thresh) {

        let useWdpa = yield cartoDBService.getWDPAGeoJSON(wdpaid);
        logger.debug('Writting geojson to file');
        let nameFile = `${TMP_PATH}/wdpa-${wdpaid}-${crypto.randomBytes(20).toString('hex')}`;
        fs.writeFileSync(nameFile, useWdpa.geojson);

        try {
            let result = yield GeeService.executePython(thresh, nameFile, period);
            if (result && result.length >= 1) {
                let data = result[0];
                data.area_ha = useWdpa.area_ha;
                return data;
            }
        } catch (e) {
            logger.error(e);
            throw e;
        } finally {
            logger.debug('Deleting file');
            try{
                fs.unlinkSync(nameFile);
            }catch(err){
                logger.error(err);
            }
        }

    }


}

module.exports = GeeService;
