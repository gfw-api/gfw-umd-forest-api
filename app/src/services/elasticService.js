'use strict';

let co = require('co');
let request = require('co-request');
const logger = require('logger');
const config = require('config');
const NotFound = require('errors/notFound');
const JSONAPIDeserializer = require('jsonapi-serializer').Deserializer;
const MicroServiceClient = require('vizz.microservice-client');

const getLocationString = ({ iso, adm1, adm2 }) => {
    return `iso = '${iso}' ${adm1 ? `AND adm1 = ${adm1}` : ''} ${adm2 ? `AND adm2 = ${adm2}` : ''}`;
};

const getLocationVars = ({ adm1, adm2 }) => {
    return `iso${adm1 ? `, adm1` : ''}${adm2 ? `, adm2` : ''},`;
};

const YEAR_QUERY = `SELECT {vars} year_data.year as year, SUM(year_data.area_loss) as area_loss, \
                SUM(year_data.carbon_emissions) as emissions, \
                SUM(year_data.biomass_loss) as biomass_loss \
                FROM data
                WHERE {location} \
                AND threshold = {threshold} \
                GROUP BY nested(year_data.year)`;

const BASE_QUERY = `SELECT {vars} SUM(total_area) AS area, SUM(total_gain) AS gain, \
                SUM(extent_2000) AS extent2000, SUM(extent_2010) AS extent2010, \
                SUM(weighted_biomass_per_ha) AS biomass_density \
                FROM data
                WHERE {location} \
                AND threshold = {threshold}`;

var deserializer = function (obj) {
    return function (callback) {
        new JSONAPIDeserializer({ keyForAttribute: 'camelCase' }).deserialize(obj, callback);
    };
};

class ElasticService {
    // use this for testing locally
    static * getData(sql, params) {
        const { iso, adm1, adm2 } = params;
        console.log(`${JSON.stringify(adm2)}`)
        sql = sql.replace('{location}', getLocationString(params))
                 .replace('{vars}', getLocationVars(params))
                 .replace('{threshold}', params.thresh)
        let id = config.get('elasticTable.v3_adm2')
         if (!adm2 && adm1) {
            id = config.get('elasticTable.v3_adm1');
        }
        else if (!adm2) {
            id = config.get('elasticTable.v3_iso');
        }
        const url = `https://production-api.globalforestwatch.org/v1/query/${id}?sql=`;
        logger.debug('Obtaining data with:', url+sql);
        let result = yield request.get(url+sql);
        if (result.statusCode !== 200) {
            console.error('Error obtaining data:');
            console.error(result);
            return null;
        }
        return JSON.parse(result.body);
    }

    // Use this one for prod/staging
    // static * getData(sqlTemplate, params) {
    //     const {iso, adm1, adm2} = params
    //     const sql = sqlTemplate.replace('{location}', getLocationString(params))
    //         .replace('{vars}', getLocationVars(params))
    //         .replace('{threshold}', params.thresh)
    //     logger.debug('Obtaining data with:', sql);
    //     let tableId = config.get('elasticTable.v3_adm2');
    //     if (!adm2 && adm1) {
    //         tableId = config.get('elasticTable.v3_adm1');
    //     }
    //     else if (!adm2) {
    //         tableId = config.get('elasticTable.v3_iso');
    //     }
    //     try {
    //         const result = yield MicroServiceClient.requestToMicroservice({
    //             uri: `/query/${tableId}?sql=${sql}`,
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

    static getYearTotals(data, periods) {
        const filtered = periods ? data.filter(year => year.year >= periods[0] && year.year <= periods[1]) : data;
        let tmp = {
            loss: 0,
            emissions: 0
        };
        filtered.forEach(el => {
            tmp['loss'] += el.area_loss;
            tmp['emissions'] += el.emissions;
        });
        return tmp;
    }

    static getYearArray(data, periods) {
        const year_array = data.year_data;
        const filtered = periods ? year_array.filter(year => year.year >= periods[0] && year.year <= periods[1]) : year_array;   
        const parsedData = filtered.map(el => {
            return {
                year: el.year,
                loss: el.area_loss,
                emissions: el.area_loss,
                biomassLoss: el.biomass_loss,
                lossPerc: 100 * el.area_loss / data.area,
                emissionsPerc: 100 * el.emissions / data.area,
                biomassLossPerc: 100 * el.biomass_loss / data.area
            };
        });
        return parsedData
    }

    static getTotals(data, periods) {
        const returnData = {
            extent2000: data.extent2000,
            extent2000Perc: 100 * data.extent2000 / data.area,
            extent2010: data.extent2010,
            extent2010Perc: 100 * data.extent2010 / data.area,
            biomassDensity: data.biomass_density,
            gain: data.gain,
            gainPerc: 100 * data.gain / data.area,
            areaHa: data.area
        };

        const year_totals = ElasticService.getYearTotals(data.year_data, periods);
        const total_loss = year_totals.loss;
        const total_emissions = year_totals.emissions;
        const total_biomass_loss = year_totals.biomassLoss;
        returnData.loss = total_loss;
        returnData.lossPerc = 100 * total_loss / returnData.areaHa;
        returnData.emissions = total_emissions;
        returnData.emissionsPerc = 100 * total_emissions / returnData.areaHa;
        returnData.biomassLoss = total_biomass_loss;
        returnData.biomassLossPerc = 100 * total_biomass_loss / returnData.areaHa;
        return returnData;
    }

    * fetchData(params) {
        let base_data = yield ElasticService.getData(BASE_QUERY, params);
        if (!base_data || !base_data.data || base_data.data.length === 0) {
            logger.error('No base data found.');
            base_data = []
        }
        let year_data = yield ElasticService.getData(YEAR_QUERY, params);
        if (!year_data || !year_data.data || year_data.data.length === 0) {
            logger.error('No year data found.');
            year_data = []
        }
        logger.info('Retrieved SQL response', base_data);
        
        const data = base_data.length === 0 || year_data.length === 0
            ? []
            : {
            year_data: year_data.data,
            area: base_data.data[0].area,
            extent2000: base_data.data[0].extent2000,
            extent2010: base_data.data[0].extent2010,
            biomass_density: base_data.data[0].biomass_density,
            gain: base_data.data[0].gain
        };
        const periodsYears = params.period.length ? [params.period[0].slice(0, 4), params.period[1].slice(0, 4)] : null;
        if (data && Object.keys(data).length > 0) {
            const totals = ElasticService.getTotals(data, periodsYears);
            const returnData = Object.assign({
                totals,
                years: ElasticService.getYearArray(data, periodsYears)
            }, params);
            return returnData;
        }

        return [];
    }
}

module.exports = new ElasticService();
