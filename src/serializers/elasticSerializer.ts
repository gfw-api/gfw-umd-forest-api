import { Serializer } from 'jsonapi-serializer';

const elasticSerializer: Serializer = new Serializer('umd-loss-gain', {

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
    typeForAttribute: (attribute: string) => attribute,
    keyForAttribute: 'camelCase'
});

class ElasticSerializer {

    static serialize(data: Record<string, any>): Record<string, any> {
        return elasticSerializer.serialize(data);
    }

}

export default ElasticSerializer;
