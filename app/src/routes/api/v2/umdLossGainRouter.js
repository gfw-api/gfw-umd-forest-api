'use strict';

const Router = require('koa-router');
const logger = require('logger');
const ElasticService = require('services/elasticService');
const NotFound = require('errors/notFound');
const DateValidator = require('validators/dateValidator');
const InvalidPeriod = require('errors/invalidPeriod');
const ElasticSerializer = require('serializers/elasticSerializer');
const GeostoreService = require('services/geostoreService');

const router = new Router({
    prefix: '/umd-loss-gain'
});
const GADM = '2.8';

class UMDLossGainRouterV2 {

    static * fetchData(){
        const { iso, id1, id2} = this.params;
        logger.info('Obtaining data for', this.params);
        const thresh = this.query.thresh || '30';
        const polyname = this.query.polyname || 'gadm28';
        const period = this.query.period ? this.query.period.split(',').map(el => el.trim()).join(',').split(',') : [];

        try {
            DateValidator.validatePeriod(period);
            let data = yield ElasticService.fetchData({ iso: iso.toUpperCase(), adm1: id1, adm2: id2, thresh, polyname, period, gadm: GADM });
            this.body = ElasticSerializer.serialize(data);

        } catch (err) {
            logger.error(err);
            if (err instanceof InvalidPeriod) {
                this.throw(400, err.message);
                return;
            }
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

module.exports = router;
