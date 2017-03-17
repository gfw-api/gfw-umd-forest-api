'use strict';

var logger = require('logger');
var JSONAPISerializer = require('jsonapi-serializer').Serializer;
var useSerializer = new JSONAPISerializer('use', {
    attributes: ['loss', 'gain', 'tree-extent', 'area_ha', 'year_loss'],
    year_loss:{
        attributes: ['loss_2001','loss_2002','loss_2003','loss_2004','loss_2005','loss_2006',
                    'loss_2007','loss_2008','loss_2009', 'loss_2010','loss_2011','loss_2012',
                    'loss_2013','loss_2014','loss_2015']
    },
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
