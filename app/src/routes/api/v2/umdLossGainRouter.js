'use strict';

const Router = require('koa-router');
const logger = require('logger');
const V2DBService = require('services/v2DBService');
const NotFound = require('errors/notFound');
const V2UMDSerializer = require('serializers/v2UmdSerializer');

const router = new Router({
    prefix: '/umd-loss-gain'
});

class UMDLossGainRouterV2 {

    static * fetchData(){
        const { iso, id1, id2} = this.params;
        logger.info('Obtaining adm2 data');
        const thresh = this.query.thresh || '30';
        const polyname = this.query.polyname || 'gadm28';
        const period = this.query.period || null;
        let data = yield V2DBService.fetchData({ iso: iso.toUpperCase(), adm1: id1, adm2: id2, thresh, polyname, period });
        this.body = V2UMDSerializer.serialize(data);
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
