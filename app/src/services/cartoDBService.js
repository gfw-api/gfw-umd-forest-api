'use strict';
var logger = require('logger');
var config = require('config');
var CartoDB = require('cartodb');
var Mustache = require('mustache');

const IFL = 'SELECT iso, country, ifl_loss, ifl_loss_perc, ifl_treecover_2000, threshold, year \
            FROM loss_analysis_ifl \
            WHERE iso = UPPER(\'{iso}\') \
                AND id1 is null \
                AND threshold = {thresh}';


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

    * getIFL(iso, thresh){
        let data = yield executeThunk(this.client, SELECT_SQL, {iso: iso, thresh: thresh});
        return data.rows;
    }

}

module.exports = new CartoDBService();
