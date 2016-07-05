'use strict';

var logger = require('logger');
var JSONAPISerializer = require('jsonapi-serializer').Serializer;
var umdSerializer = new JSONAPISerializer('umd', {

    attributes: ['total', 'years'],
    total:{
        attributes: ['loss', 'total_gain', 'extent']
    },
    years: {
        attributes: ['iso', 'country', 'thresh', 'year', 'id1', 'extent', 'extent_perc', 'loss', 'loss_perc', 'gain', 'total_gain', 'gain_perc']
    },
    typeForAttribute: function (attribute, record) {
        return attribute;
    },
    keyForAttribute: 'camelCase'
});

class UMDSerializer {

  static serialize(data) {
    return umdSerializer.serialize(data);
  }
}

module.exports = UMDSerializer;
