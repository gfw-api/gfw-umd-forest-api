'use strict';

const Router = require('koa-router');
const logger = require('logger');
const ElasticService = require('services/elasticService');
const DateValidator = require('validators/dateValidator');
const InvalidPeriod = require('errors/invalidPeriod');
const config = require('config');
const ElasticSerializer = require('serializers/elasticSerializer');
const GladAlertsService = require('services/gladAlertsService');

const router = new Router({
    prefix: '/umd-loss-gain'
});
const GADM = '3.6';

class UMDLossGainRouterV3 {

    static * fetchData(){
        const { iso, id1, id2} = this.params;
        logger.info('Obtaining data for', this.params);
        const thresh = this.query.thresh || '30';
        const polyname = this.query.polyname || 'admin';
        const period = this.query.period ? this.query.period.split(',').map(el => el.trim()) : []; // why the second split?

        try {
            let glads = null;
            if (period.length && DateValidator.validatePeriod(period) && config.get('gladWhitelist.iso').includes(iso)) {
                glads = yield GladAlertsService.fetchData({ iso: iso.toUpperCase(), adm1: id1, adm2: id2, thresh, polyname, period });
            }
            let data = yield ElasticService.fetchData({ iso: iso.toUpperCase(), adm1: id1, adm2: id2, thresh, polyname, period, gadm: GADM });
            if (data && data.totals) { // added validation
                data.totals.gladAlerts = glads;
            }
            this.body = ElasticSerializer.serialize(data);

        } catch (err) {
            logger.error(err);
            if (err instanceof InvalidPeriod) {
                this.throw(400, err.message);
                return;
            }
            // just return a generic error if an error is caught but not identified
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

router.get('/admin/:iso/:id1?/:id2?', isCached, UMDLossGainRouterV3.fetchData);

module.exports = router;
