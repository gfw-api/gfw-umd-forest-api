const logger = require('logger');
const JSONAPIDeserializer = require('jsonapi-serializer').Deserializer;
const { RWAPIMicroservice } = require('rw-api-microservice-node');


const deserializer = (obj) => (callback) => {
    new JSONAPIDeserializer({ keyForAttribute: 'camelCase' }).deserialize(obj, callback);
};

class GeostoreService {

    static* getGeostore(path) {
        logger.debug('Obtaining geostore with path %s', path);
        const result = yield RWAPIMicroservice.requestToMicroservice({
            uri: `/geostore/${path}`,
            method: 'GET',
            json: true,
            resolveWithFullResponse: true
        });
        if (result.statusCode !== 200) {
            logger.warn('Error obtaining geostore:');
            logger.warn(result);
            return null;
        }
        return yield deserializer(result.body);
    }

    static* getGeostoreByHash(hash) {
        logger.debug('Getting geostore');
        return yield GeostoreService.getGeostore(hash);
    }

    static* getGeostoreByIso(iso) {
        logger.debug('Getting geostore by iso');
        return yield GeostoreService.getGeostore(`admin/${iso}`);
    }

    static* getGeostoreByIsoAndId(iso, id1) {
        logger.debug('Getting geostore by iso and region');
        return yield GeostoreService.getGeostore(`admin/${iso}/${id1}`);
    }

    static* getGeostoreByUse(useTable, id) {
        logger.debug('Getting geostore by use');
        return yield GeostoreService.getGeostore(`use/${useTable}/${id}`);
    }

    static* getGeostoreByWdpa(wdpaid) {
        logger.debug('Getting geostore by use');
        return yield GeostoreService.getGeostore(`wdpa/${wdpaid}`);
    }

}

module.exports = GeostoreService;
