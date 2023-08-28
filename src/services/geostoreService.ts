import logger from 'logger';
import { RWAPIMicroservice } from "rw-api-microservice-node";
import { Deserializer } from "jsonapi-serializer";


class GeostoreService {

    static async getGeostore(path: string, apiKey: string): Promise<Record<string, any>> {
        logger.debug('Obtaining geostore with path %s', path);
        const result: Record<string, any> = await RWAPIMicroservice.requestToMicroservice({
            uri: `/v1/geostore/${path}`,
            method: 'GET',
            headers: {
                'x-api-key': apiKey
            }
        });
        if (result.statusCode !== 200) {
            logger.warn('Error obtaining geostore:');
            logger.warn(result);
            return null;
        }
        return await new Deserializer({
            keyForAttribute: 'camelCase'
        }).deserialize(result);
    }

    static async getGeostoreByHash(hash: string, apiKey: string): Promise<Record<string, any>> {
        logger.debug('Getting geostore');
        return await GeostoreService.getGeostore(hash, apiKey);
    }

    static async getGeostoreByIso(iso: string, apiKey: string): Promise<Record<string, any>> {
        logger.debug('Getting geostore by iso');
        return await GeostoreService.getGeostore(`admin/${iso}`, apiKey);
    }

    static async getGeostoreByIsoAndId(iso: string, id1: string, apiKey: string): Promise<Record<string, any>> {
        logger.debug('Getting geostore by iso and region');
        return await GeostoreService.getGeostore(`admin/${iso}/${id1}`, apiKey);
    }

    static async getGeostoreByUse(useTable: string, id: string, apiKey: string): Promise<Record<string, any>> {
        logger.debug('Getting geostore by use');
        return await GeostoreService.getGeostore(`use/${useTable}/${id}`, apiKey);
    }

    static async getGeostoreByWdpa(wdpaid: string, apiKey: string): Promise<Record<string, any>> {
        logger.debug('Getting geostore by use');
        return await GeostoreService.getGeostore(`wdpa/${wdpaid}`, apiKey);
    }

}

export default GeostoreService;
