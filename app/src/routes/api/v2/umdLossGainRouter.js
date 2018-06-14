'use strict';

const Router = require('koa-router');
const logger = require('logger');
const moment = require('moment');
const NotFound = require('errors/notFound');
const ElasticService = require('services/elasticService');
const DateValidator = require('validators/dateValidator');
const InvalidPeriod = require('errors/invalidPeriod');
const ElasticSerializer = require('serializers/elasticSerializer');
const GeostoreService = require('services/geostoreService');
const GladAlertsService = require('services/gladAlertsService');

const router = new Router({
    prefix: '/umd-loss-gain'
});
const GADM = '2.8';

class UMDLossGainRouterV2 {

    static * fetchData(){
        const { iso, id1, id2 } = this.params;
        logger.info('Obtaining data for', this.params);
        const thresh = this.query.thresh || '30';
        const polyname = this.query.polyname || 'gadm28';
        const period = this.query.period ? this.query.period.split(',').map(el => el.trim()) : []; // why the second split?
        const geostore = this.query.geostore || null;

        try {
            let glads = null;
            if (period.length && DateValidator.validatePeriod(period) && moment(period[1]).isAfter('2015-01-01')) {
                glads = yield GladAlertsService.fetchData({ iso: iso.toUpperCase(), adm1: id1, adm2: id2, thresh, polyname, period });
            }
            let data = yield ElasticService.fetchData({ iso: iso.toUpperCase(), adm1: id1, adm2: id2, thresh, polyname, period, gadm: GADM });
            if (data && data.totals) {
                data.totals.gladAlerts = glads;
            }
            this.body = ElasticSerializer.serialize(data);

        } catch (err) {
            logger.error(err);
            if (err instanceof InvalidPeriod) {
                this.throw(400, err.message);
                return;
            }
            this.throw(500, 'Internal Server Error');
            return;
        }
    }

    static * fetchDataByGeostore(){
        logger.info('Obtaining data for geostore: ', this.query.geostore);
        const geostore = this.query.geostore || null;
        const thresh = this.query.thresh || '30';
        const polyname = this.query.polyname || 'gadm28';
        const period = this.query.period ? this.query.period.split(',').map(el => el.trim()) : []; // why the second split?

        try {
            let data = null;
            if (period.length && DateValidator.validatePeriod(period) && moment(period[1]).isAfter('2015-01-01')) {
                data = yield GladAlertsService.fetchData({ thresh, polyname, period, geostore });
            }
            this.body = {gladAlerts: data};

        } catch (err) {
            logger.error(err);
            if (err instanceof InvalidPeriod) {
                this.throw(400, err.message);
                return;
            }
            this.throw(500, 'Internal Server Error');
            return;
        }
    }
}

var isCached =  function *(next){
    if (yield this.cashed()) {
        return;
    }
    yield next;
};

router.get('/admin/:iso/:id1?/:id2?', isCached, UMDLossGainRouterV2.fetchData);
router.get('/geostore', isCached, UMDLossGainRouterV2.fetchDataByGeostore);

module.exports = router;
