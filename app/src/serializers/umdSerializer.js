'use strict';

var logger = require('logger');
var JSONAPISerializer = require('jsonapi-serializer').Serializer;
var umdSerializer = new JSONAPISerializer('umd-loss-gain', {

    attributes: ['total', 'years'],
    total: {
        attributes: ['loss', 'gain', 'tree_extent', 'area_ha']
    },
    years: {
        attributes: ['iso', 'country', 'thresh', 'year', 'id1', 'extent', 'extent_perc', 'loss', 'loss_perc', 'gain', 'total_gain', 'gain_perc', 'area_ha']
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
