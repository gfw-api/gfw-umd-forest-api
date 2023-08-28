import { Serializer } from 'jsonapi-serializer';

const umdSerializer: Serializer = new Serializer('umd-loss-gain', {

    attributes: ['total', 'years'],
    total: {
        attributes: ['loss', 'gain', 'tree_extent', 'area_ha']
    },
    years: {
        attributes: ['iso', 'country', 'thresh', 'year', 'id1', 'extent', 'extent_perc', 'loss', 'loss_perc', 'gain', 'total_gain', 'gain_perc', 'area_ha']
    },
    typeForAttribute: (attribute: string) => attribute,
    keyForAttribute: 'camelCase'
});

class UMDSerializer {

    static serialize(data: Record<string, any>): Record<string, any> {
        return umdSerializer.serialize(data);
    }

}

export default UMDSerializer;
