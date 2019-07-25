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

    static* fetchData() {
        logger.info('Obtaining data for', this.params);
        const thresh = this.query.thresh || '30';
        const polyname = this.query.polyname || 'admin';
        const period = this.query.period ? this.query.period.split(',').map(el => el.trim()) : [];
        const iso = this.params.iso || null;
        const id1 = this.params.id1 || null;
        const id2 = this.params.id2 || null;
        try {
            let glads = null;
            if (period.length && DateValidator.validatePeriod(period) && config.get('gladWhitelist.iso').includes(iso)) {
                glads = yield GladAlertsService.fetchData({
                    iso: iso.toUpperCase(),
                    adm1: id1,
                    adm2: id2,
                    thresh,
                    polyname,
                    period
                });
            }
            let data = yield ElasticService.fetchData({
                iso: iso.toUpperCase(),
                adm1: id1,
                adm2: id2,
                thresh,
                polyname,
                period,
                gadm: GADM
            });
            if (data) {
                if (data.totals) data.totals.gladAlerts = glads;
                data.downloadUrls = { 
                    url: 'https://earthenginepartners.appspot.com/science-2013-global-forest',
                    xlsx: `https://gfw2-data.s3.amazonaws.com/country-pages/country_stats/download/${iso}.xlsx`
                };
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

var isCached = function* (next) {
    if (yield this.cashed()) {
        return;
    }
    yield next;
};

router.get('/admin/:iso/:id1?/:id2?', isCached, UMDLossGainRouterV3.fetchData);

module.exports = router;
