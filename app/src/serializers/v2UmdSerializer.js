'use strict';

var logger = require('logger');
var JSONAPISerializer = require('jsonapi-serializer').Serializer;
var v2UmdSerializer = new JSONAPISerializer('umd', {

    attributes: ['iso', 'adm1', 'adm2', 'thresh', 'total', 'years'],
    total:{
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

class V2UMDSerializer {

  static serialize(data) {
    return v2UmdSerializer.serialize(data);
  }
}

module.exports = V2UMDSerializer;
