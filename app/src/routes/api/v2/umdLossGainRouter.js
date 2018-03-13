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

    static * getAdm2(){
        logger.info('Obtaining adm2 data');
        const thresh = this.query.thresh || '30';
        let data = yield V2DBService.getAdm2(this.params.iso, this.params.id1, this.params.id2, thresh);
        this.body = V2UMDSerializer.serialize(data);
    }

    static * getAdm1(){
        logger.info('Obtaining adm1 data');
        const thresh = this.query.thresh || '30';
        let data = yield V2DBService.getAdm1(this.params.iso, this.params.id1, thresh);
        this.body = V2UMDSerializer.serialize(data);
    }

    static * getIso(){
        logger.info('Obtaining adm0 data');
        const thresh = this.query.thresh || '30';
        let data = yield V2DBService.getIso(this.params.iso, thresh);
        this.body = V2UMDSerializer.serialize(data);
    }

}

// var isCached =  function *(next){
//     if (yield this.cashed()) {
//         return;
//     }
//     yield next;
// };

router.get('/admin/:iso', /*isCached,*/ UMDLossGainRouterV2.getIso);
router.get('/admin/:iso/:id1', /*isCached,*/ UMDLossGainRouterV2.getAdm1);
router.get('/admin/:iso/:id1/:id2', /*isCached,*/ UMDLossGainRouterV2.getAdm2);

module.exports = router;
