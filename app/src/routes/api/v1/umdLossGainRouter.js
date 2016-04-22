'use strict';

var Router = require('koa-router');
var logger = require('logger');
var CartoDBService = require('services/cartoDBService');

var router = new Router({
    prefix: '/umd-loss-gain'
});

class UMDLossGainRouter {

    static * getIFLNational(){
        logger.info('Obtaining ifl national data');
        this.assert(this.query.thresh, 400, 'thresh param required');
        this.body= yield CartoDBService.getIFLNational(this.params.iso, this.query.thresh);
    }

    static * getIFLSubnational(){
        logger.info('Obtaining ifl subnational data');
        this.assert(this.query.thresh, 400, 'thresh param required');
        this.body= yield CartoDBService.getIFLSubnational(this.params.iso, this.params.id1, this.query.thresh);
    }

    static * getNational(){
        logger.info('Obtaining national data');
        if (yield this.cashed()) {
            return;
        }
        this.assert(this.query.thresh, 400, 'thresh param required');
        this.body= yield CartoDBService.getNational(this.params.iso, this.query.thresh);
    }

    static * getSubnational(){
        logger.info('Obtaining subnational data');
        this.assert(this.query.thresh, 400, 'thresh param required');
        this.body= yield CartoDBService.getSubnational(this.params.iso, this.params.id1, this.query.thresh);
    }

    static * use(){
        this.body={data: 'use'};
    }

    static * wdpa(){
        this.body={data: 'wdpa'};
    }

    static * world(){
        this.body={data:'world'};
    }

}

router.get('/admin/ifl/:iso', UMDLossGainRouter.getIFLNational);
router.get('/admin/ifl/:iso/:id1', UMDLossGainRouter.getIFLSubnational);
router.get('/admin/:iso', UMDLossGainRouter.getNational);
router.get('/admin/:iso/:id1', UMDLossGainRouter.getSubnational);
router.get('/use/:name/:id', UMDLossGainRouter.use);
router.get('/wdpa/:id', UMDLossGainRouter.wdpa);
router.get('/', UMDLossGainRouter.world);


module.exports = router;
