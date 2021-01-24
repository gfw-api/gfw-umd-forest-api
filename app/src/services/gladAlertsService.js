const logger = require('logger');
const moment = require('moment');
const { RWAPIMicroservice } = require('rw-api-microservice-node');

const getLocationVars = ({ iso, adm1 }) => (adm1 ? `${iso}/${adm1}` : `${iso}`);

const GLAD_URL = '/glad-alerts/admin/{location}{period}{threshold}';

class GladAlertsService {

    static* getData(url, params) {
        // eslint-disable-next-line no-param-reassign
        url = url.replace('{location}', getLocationVars(params))
            .replace('{period}', `?period=${params.period}`)
            .replace('{threshold}', `&thresh=${params.thresh}`);
        logger.debug('Obtaining data');
        try {
            const result = yield RWAPIMicroservice.requestToMicroservice({
                uri: url,
                method: 'GET',
                json: true
            });
            logger.debug(result);
            return result;
        } catch (err) {
            logger.error(err);
            throw err;
        }
    }

    // eslint-disable-next-line class-methods-use-this
    * fetchData(params) {
        const dates = params.period;

        if (moment(dates[0]).isBefore('2015-01-01')) {
            params.period = '2015-01-01,'.concat(dates[1]);
            logger.debug(params.period);
        } else {
            params.period = dates.join(',');
        }

        const data = yield GladAlertsService.getData(GLAD_URL, params);

        if (data && data.data) {
            return data.data.attributes.value || 0;
        }
        logger.error('No GLAD data found.');
        return null;
        // error message for cases where data.data =[]
    }

}

module.exports = new GladAlertsService();
