'use strict';

var logger = require('logger');
var JSONAPISerializer = require('jsonapi-serializer').Serializer;
var umdIflSerializer = new JSONAPISerializer('umdIfl', {
    attributes: ['iso', 'country', 'threshold', 'year', 'id1', 'ifl_loss', 'ifl_loss_perc', 'ifl_treecover_2000'],
    typeForAttribute: function (attribute, record) {
        return attribute;
    },
    keyForAttribute: 'camelCase'
});

class UMDIFLSerializer {

    static serialize(data) {
        return umdIflSerializer.serialize(data);
    }
}

module.exports = UMDIFLSerializer;
