'use strict';
var logger = require('logger');
var path = require('path');
var config = require('config');
var CartoDB = require('cartodb');
var Mustache = require('mustache');
var PythonShell = require('python-shell');
var NotFound = require('errors/notFound');
var JSONAPIDeserializer = require('jsonapi-serializer').Deserializer;
var fs = require('fs');

var TMP_PATH = '/tmp';

var deserializer = function(obj){
    return function(callback){
        new JSONAPIDeserializer({keyForAttribute: 'camelCase'}).deserialize(obj, callback);
    };
};


const IFL = 'SELECT iso, country, ifl_loss, ifl_loss_perc, ifl_treecover_2000, threshold, year \
            FROM loss_analysis_ifl \
            WHERE iso = UPPER(\'{{iso}}\') \
                AND id1 is null \
                AND threshold = {{thresh}}';

const IFL_ID1 = 'SELECT iso, country, ifl_loss, ifl_loss_perc, ifl_treecover_2000, threshold, year, id1 \
                FROM loss_analysis_ifl \
                WHERE iso = UPPER(\'{{iso}}\') \
                AND id1 = {{id1}} \
                AND threshold = {{thresh}}';
const ISO = 'SELECT iso, country, year, thresh, extent_2000 as extent, extent_perc, \
            loss, loss_perc, gain, gain*12 as total_gain, gain_perc \
            FROM umd_nat_final_1 \
            WHERE iso = UPPER(\'{{iso}}\') \
              AND thresh = {{thresh}} \
              ORDER BY year';
const ID1 = 'SELECT     iso, country, region, year, thresh, extent_2000 as extent, \
             extent_perc, loss, loss_perc, gain, gain*12 as total_gain, \
             gain_perc, id1 \
             FROM umd_subnat_final_1 \
             WHERE iso = UPPER(\'{{iso}}\') \
                AND thresh = {{thresh}} \
                AND id1 = {{id1}} \
             ORDER BY year';
const USE = 'SELECT CASE when ST_NPoints(the_geom)<=8000 THEN ST_AsGeoJson(the_geom) \
            WHEN ST_NPoints(the_geom) BETWEEN 8000 AND 20000 THEN ST_AsGeoJson(ST_RemoveRepeatedPoints(the_geom, 0.001)) \
            ELSE ST_AsGeoJson(ST_RemoveRepeatedPoints(the_geom, 0.01)) \
            END as geojson \
            FROM {{useTable}} \
            WHERE cartodb_id = {{id}}';

const WDPA = 'SELECT CASE when marine::numeric = 2 then null \
            when ST_NPoints(the_geom)<=18000 THEN ST_AsGeoJson(the_geom) \
            WHEN ST_NPoints(the_geom) BETWEEN 18000 AND 50000 THEN ST_AsGeoJson(ST_RemoveRepeatedPoints(the_geom, 0.001)) \
            ELSE ST_AsGeoJson(ST_RemoveRepeatedPoints(the_geom, 0.005)) \
            END as geojson FROM wdpa_protected_areas where wdpaid={{wdpaid}}';


var executeThunk = function(client, sql, params) {
    return function(callback) {
        logger.debug(Mustache.render(sql, params));
        client.execute(sql, params).done(function(data) {
            callback(null, data);
        }).error(function(err) {
            callback(err, null);
        });
    };
};

var pythonRun = function(script, options) {
    return function(callback) {
        PythonShell.run(script, options, callback);
    };
};

function wrapQuotes(text) {
    return '\'' + text + '\'';
}

class CartoDBService {

    constructor() {
        this.client = new CartoDB.SQL({
            user: config.get('cartoDB.user'),
            api_key: config.get('cartoDB.apiKey')
        });
    }

    * getIFLNational(iso, thresh) {
        let data = yield executeThunk(this.client, IFL, {
            iso: iso,
            thresh: thresh
        });
        return data.rows;
    }

    * getIFLSubnational(iso, id1, thresh) {
        let data = yield executeThunk(this.client, IFL_ID1, {
            iso: iso,
            id1: id1,
            thresh: thresh
        });
        return data.rows;
    }

    * getNational(iso, thresh) {
        let data = yield executeThunk(this.client, ISO, {
            iso: iso,
            thresh: thresh
        });
        return data.rows;
    }

    * getSubnational(iso, id1, thresh) {
        let data = yield executeThunk(this.client, ID1, {
            iso: iso,
            id1: id1,
            thresh: thresh
        });
        return data.rows;
    }

    * executePython(thresh, geojson, period) {
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

    * getGeostore(hashGeoStore) {
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

    * getWorld(hashGeoJson, period, thresh) {
        logger.debug('Obtaining geojson');
        let geostore = yield this.getGeostore(hashGeoJson);
        logger.debug('Geostore obtained', JSON.stringify(geostore.geojson));
        logger.debug('Writting geojson to file');
        fs.writeFileSync(TMP_PATH + '/world-' + hashGeoJson, JSON.stringify(geostore.geojson));
        try {

            let result = yield this.executePython(thresh, TMP_PATH + '/world-' + hashGeoJson, period);
            if (result && result.length >= 1) {
                return result[0];
            }
        } catch (e) {
            logger.error(e);
            throw e;
        } finally {
            logger.debug('Deleting file');
            // fs.unlinkSync(TMP_PATH + '/world-' + hashGeoJson);
        }

    }

    * getUse(useTable, id, period, thresh) {
        let data = yield executeThunk(this.client, USE, {
            useTable: useTable,
            id: id
        });
        if (!data || !data.rows || data.rows.length === 0 || !data.rows[0].geojson) {
            logger.info('Geojson not found');
            throw new NotFound('Geojson not found');
        }
        let geojson = data.rows[0].geojson;
        logger.debug('Writting geojson to file');
        fs.writeFileSync(TMP_PATH + '/use-' + id, geojson);

        try {

            let result = yield this.executePython(thresh, TMP_PATH + '/use-' + id, period);
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

    * getWdpa(wdpaid, period, thresh) {

        logger.debug('Obtaining geojson');
        let data = yield executeThunk(this.client, WDPA, {
            wdpaid: wdpaid
        });
        if (!data || !data.rows || data.rows.length === 0 || !data.rows[0].geojson) {
            logger.info('Geojson not found');
            throw new NotFound('Geojson not found');
        }
        let geojson = data.rows[0].geojson;
        logger.debug('Writting geojson to file');
        fs.writeFileSync(TMP_PATH + '/wdpa-' + wdpaid, geojson);

        try {
            let result = yield this.executePython(thresh, TMP_PATH + '/wdpa-' + wdpaid, period);
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

module.exports = new CartoDBService();
