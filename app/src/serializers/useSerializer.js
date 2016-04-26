'use strict';

var logger = require('logger');
var JSONAPISerializer = require('jsonapi-serializer').Serializer;
var useSerializer = new JSONAPISerializer('use', {
    attributes: ['loss', 'gain', 'tree-extent'],
    typeForAttribute: function (attribute, record) {
        return attribute;
    },
    keyForAttribute: 'camelCase'
});

class UseSerializer {

  static serialize(data) {
    return useSerializer.serialize(data);
  }
}

module.exports = UseSerializer;
