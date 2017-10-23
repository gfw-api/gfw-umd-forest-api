'use strict';
const logger = require('logger');
const path = require('path');
const config = require('config');
const CartoDB = require('cartodb');
const Mustache = require('mustache');
const NotFound = require('errors/notFound');


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
            loss, loss_perc, gain, gain as total_gain, gain_perc, land as area_ha \
            FROM umd_nat_staging \
            WHERE iso = UPPER(\'{{iso}}\') \
              AND thresh = {{thresh}} \
              ORDER BY year';

const ID1 = 'SELECT     iso, country, region, year, thresh, extent_2000 as extent, \
             extent_perc, loss, loss_perc, gain, gain as total_gain, \
             gain_perc, id1, land as area_ha \
             FROM umd_subnat_staging \
             WHERE iso = UPPER(\'{{iso}}\') \
                AND thresh = {{thresh}} \
                AND id1 = {{id1}} \
             ORDER BY year';

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


function wrapQuotes(text) {
    return '\'' + text + '\'';
}

class CartoDBService {

    constructor() {
        this.client = new CartoDB.SQL({
            user: config.get('cartoDB.user')
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

    * getNational(iso, thresh, period ='2001-01-01,2013-01-01') {
        let data = yield executeThunk(this.client, ISO, {
            iso: iso,
            thresh: thresh
        });

        if(data.rows && data.rows.length > 0){
            let periods = period.split(',');
            let initYear = new Date(periods[0]).getFullYear();
            let lastYear = new Date(periods[1]).getFullYear();
            let single = {
                loss: 0,
                gain: 0,
                tree_extent: 0,
                area_ha: 0
            };
            for(let i=0, length = data.rows.length; i < length; i++){
                if(data.rows[i].year >= initYear && data.rows[i].year <= lastYear){
                    if(data.rows[i].loss){
                        single.loss += data.rows[i].loss;
                    }
                    if(data.rows[i].total_gain){
                        single.gain = data.rows[i].total_gain;
                    }
                    if(data.rows[i].extent){
                        single.tree_extent = data.rows[i].extent;
                    }
                    if(data.rows[i].area_ha){
                        single.area_ha = data.rows[i].area_ha;
                    }
                }
            }
            return {
                total: single,
                years:data.rows
            };
        }
        return {years: data.rows};

    }

    * getSubnational(iso, id1, thresh, period='2001-01-01,2013-01-01') {

        let data = yield executeThunk(this.client, ID1, {
            iso: iso,
            id1: id1,
            thresh: thresh
        });
        if(data.rows && data.rows.length > 0){
            logger.debug('Exist rows');
            let periods = period.split(',');

            let initYear = new Date(periods[0]).getFullYear();
            let lastYear = new Date(periods[1]).getFullYear();
            let single = {
                loss: 0,
                gain: 0,
                tree_extent: 0,
                area_ha: 0
            };
            for(let i=0, length = data.rows.length; i < length; i++){
                if(data.rows[i].year >= initYear && data.rows[i].year <= lastYear){
                    if(data.rows[i].loss){
                        single.loss += data.rows[i].loss;
                    }
                    if(data.rows[i].total_gain){
                        single.gain = data.rows[i].total_gain;
                    }
                    if(data.rows[i].extent){
                        single.tree_extent = data.rows[i].extent;
                    }
                    if(data.rows[i].area_ha){
                        single.area_ha = data.rows[i].area_ha;
                    }
                }
            }
            return {
                total: single,
                years:data.rows
            };
        }
        return {years: data.rows};
    }

}

module.exports = new CartoDBService();
