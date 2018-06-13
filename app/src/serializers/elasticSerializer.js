'use strict';

var logger = require('logger');
var JSONAPISerializer = require('jsonapi-serializer').Serializer;
var elasticSerializer = new JSONAPISerializer('umd', {

    attributes: ['gadm', 'iso', 'adm1', 'adm2', 'thresh', 'polyname', 'period', 'totals', 'years'],
    totals:{
        attributes: ['areaHa', 'extent2000', 'extent2000Perc', 'extent2010', 'extent2010Perc', 'gain', 'gainPerc', 'loss', 'lossPerc']
    },
    years: {
        attributes: ['year', 'loss', 'lossPerc']
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
