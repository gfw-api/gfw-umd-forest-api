'use strict';

var logger = require('logger');
var JSONAPISerializer = require('jsonapi-serializer').Serializer;
var elasticSerializer = new JSONAPISerializer('umd-loss-gain', {

    attributes: ['gadm', 'iso', 'adm1', 'adm2', 'thresh', 'polyname', 'period', 'totals', 'years', 'downloadUrls'],
    totals: {
        attributes: ['areaHa', 'extent2000', 'extent2000Perc', 'extent2010', 'extent2010Perc', 'gain', 'gainPerc', 'biomassDensity', 'loss', 'lossPerc', 'emissions', 'emissionsPerc', 'gladAlerts']
    },
    years: {
        attributes: ['year', 'loss', 'lossPerc', 'emissions', 'emissionsPerc']
    },
    'downloadUrls': {
        attributes: ['url', 'xlsx']
    },
    typeForAttribute: function (attribute, record) {
        return attribute;
    },
    keyForAttribute: 'camelCase'
});

class ElasticSerializer {

    static serialize(data) {
        return elasticSerializer.serialize(data);
    }
}

module.exports = ElasticSerializer;
