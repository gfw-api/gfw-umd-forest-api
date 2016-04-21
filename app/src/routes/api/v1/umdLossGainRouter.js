'use strict';

var Router = require('koa-router');
var logger = require('logger');

var router = new Router({
    prefix: '/umd-loss-gain'
});

class UMDLossGainRouter {

    static * getIFLNational(){
        this.body={data:'iflnational'};
    }

    static * getIFLSubnational(){
        this.body={data: 'getIFLSubnational'};
    }

    static * national(){
        this.body={data: 'national'};
    }

    static * subnational(){
        this.body={data: 'subnational'};
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
router.get('/admin/:iso', UMDLossGainRouter.national);
router.get('/admin/:iso/:id1', UMDLossGainRouter.subnational);
router.get('/use/:name/:id', UMDLossGainRouter.use);
router.get('/wdpa/:id', UMDLossGainRouter.wdpa);
router.get('/', UMDLossGainRouter.world);


module.exports = router;
