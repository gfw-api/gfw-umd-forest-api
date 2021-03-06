const JSONAPISerializer = require('jsonapi-serializer').Serializer;

const elasticSerializer = new JSONAPISerializer('umd-loss-gain', {

    attributes: ['gadm', 'iso', 'adm1', 'adm2', 'thresh', 'polyname', 'period', 'totals', 'years', 'downloadUrls'],
    totals: {
        attributes: [
            'areaHa',
            'extent2000',
            'extent2000Perc',
            'extent2010',
            'extent2010Perc',
            'gain',
            'gainPerc',
            'biomassDensity',
            'loss',
            'lossPerc',
            'emissions',
            'emissionsPerc',
            'biomassLoss',
            'biomassLossPerc',
            'gladAlerts'
        ]
    },
    years: {
        attributes: ['year', 'loss', 'lossPerc', 'emissions', 'emissionsPerc', 'biomassLoss', 'biomassLossPerc']
    },
    downloadUrls: {
        attributes: ['url', 'xlsx']
    },
    typeForAttribute(attribute) {
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
