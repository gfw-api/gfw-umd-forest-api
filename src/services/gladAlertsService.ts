import logger from 'logger';
import moment from 'moment';
import { RWAPIMicroservice } from "rw-api-microservice-node";

const getLocationVars = ({ iso, adm1 }: Record<string, any>): string => (adm1 ? `${iso}/${adm1}` : `${iso}`);

const GLAD_URL: string = '/v1/glad-alerts/admin/{location}{period}{threshold}';

class GladAlertsService {

    static async getData(url: string, params: Record<string, any>, apiKey: string): Promise<Record<string, any>> {
        // eslint-disable-next-line no-param-reassign
        url = url.replace('{location}', getLocationVars(params))
            .replace('{period}', `?period=${params.period}`)
            .replace('{threshold}', `&thresh=${params.thresh}`);
        logger.debug('Obtaining data');
        try {
            const result: Record<string, any> = await RWAPIMicroservice.requestToMicroservice({
                uri: url,
                method: 'GET',
                headers: {
                    'x-api-key': apiKey
                }
            });
            logger.debug(result);
            return result;
        } catch (err) {
            logger.error(err);
            throw err;
        }
    }

    async fetchData(params: Record<string, any>, apiKey: string): Promise<number | void> {
        const dates: Array<any> = params.period;

        if (moment(dates[0]).isBefore('2015-01-01')) {
            params.period = '2015-01-01,'.concat(dates[1]);
            logger.debug(params.period);
        } else {
            params.period = dates.join(',');
        }

        const data: Record<string, any> = await GladAlertsService.getData(GLAD_URL, params, apiKey);

        if (data && data.data) {
            return data.data.attributes.value || 0;
        }
        logger.error('No GLAD data found.');
        return null;
    }

}

export default new GladAlertsService();
