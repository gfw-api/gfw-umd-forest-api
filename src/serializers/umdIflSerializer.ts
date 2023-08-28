import { Serializer } from 'jsonapi-serializer';

const umdIflSerializer: Serializer = new Serializer('umdIfl', {
    attributes: ['iso', 'country', 'threshold', 'year', 'id1', 'ifl_loss', 'ifl_loss_perc', 'ifl_treecover_2000'],
    typeForAttribute: (attribute: string) => attribute,
    keyForAttribute: 'camelCase'
});

class UMDIFLSerializer {

    static serialize(data: Record<string, any>): Record<string, any> {
        return umdIflSerializer.serialize(data);
    }

}

export default UMDIFLSerializer;
