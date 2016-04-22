'use strict';
var logger = require('logger');
var config = require('config');
var CartoDB = require('cartodb');
var Mustache = require('mustache');

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
const ID1 = 'SELECT iso, country, region, year, thresh, extent_2000 as extent, \
             extent_perc, loss, loss_perc, gain, gain*12 as total_gain, \
             gain_perc, id1 \
             FROM umd_subnat_final_1 \
             WHERE iso = UPPER(\'{{iso}}\') \
                AND thresh = {{thresh}} \
                AND id1 = {{id1}} \
             ORDER BY year';


var executeThunk = function(client, sql, params){
    return function(callback){
        logger.debug(Mustache.render(sql, params));
        client.execute(sql, params).done(function(data){
            callback(null, data);
        }).error(function(err){
            callback(err, null);
        });
    };
};

function wrapQuotes(text){
    return '\'' + text + '\'';
}

class CartoDBService {

    constructor(){
        this.client = new CartoDB.SQL({user:config.get('cartoDB.user'), api_key:config.get('cartoDB.apiKey')});
    }

    * getIFLNational(iso, thresh){
        let data = yield executeThunk(this.client, IFL, {iso: iso, thresh: thresh});
        return data.rows;
    }

    * getIFLSubnational(iso, id1, thresh){
        let data = yield executeThunk(this.client, IFL_ID1, {iso: iso, id1: id1, thresh: thresh});
        return data.rows;
    }

    * getNational(iso, thresh){
        let data = yield executeThunk(this.client, ISO, {iso: iso, thresh: thresh});
        return data.rows;
    }

    * getSubnational(iso, id1, thresh){
        let data = yield executeThunk(this.client, ID1, {iso: iso, id1: id1,thresh: thresh});
        return data.rows;
    }

}

module.exports = new CartoDBService();
