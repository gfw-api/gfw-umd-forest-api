'use strict';



var Router = require('koa-router');
var logger = require('logger');
var CartoDBService = require('services/cartoDBService');
var GEEService = require('services/geeService');
var NotFound = require('errors/notFound');
var UMDIFLSerializer = require('serializers/umdIflSerializer');
var UMDSerializer = require('serializers/umdSerializer');
var UseSerializer = require('serializers/useSerializer');


var router = new Router({
    prefix: '/umd-loss-gain'
});

class UMDLossGainRouter {

    static * getIFLNational(){
        logger.info('Obtaining ifl national data');
        this.assert(this.query.thresh, 400, 'thresh param required');
        let data = yield CartoDBService.getIFLNational(this.params.iso, this.query.thresh);
        this.body = UMDIFLSerializer.serialize(data);
    }

    static * getIFLSubnational(){
        logger.info('Obtaining ifl subnational data');
        this.assert(this.query.thresh, 400, 'thresh param required');
        let data = yield CartoDBService.getIFLSubnational(this.params.iso, this.params.id1, this.query.thresh);
        this.body = UMDIFLSerializer.serialize(data);
    }

    static * getNational(){
        logger.info('Obtaining national data');
        if (yield this.cashed()) {
            return;
        }
        this.assert(this.query.thresh, 400, 'thresh param required');
        let data = yield CartoDBService.getNational(this.params.iso, this.query.thresh);
        this.body = UMDSerializer.serialize(data);
    }

    static * getSubnational(){
        logger.info('Obtaining subnational data');
        this.assert(this.query.thresh, 400, 'thresh param required');
        let data = yield CartoDBService.getSubnational(this.params.iso, this.params.id1, this.query.thresh);
        this.body = UMDSerializer.serialize(data);
    }

    static * use(){
        logger.info('Obtaining use data with name %s and id %s', this.params.name, this.params.id);
        let useTable = null;
        switch (this.params.name) {
            case 'mining':
                useTable = 'gfw_mining';
                break;
            case 'oilpalm':
                useTable = 'gfw_oil_palm';
                break;
            case 'fiber':
                useTable = 'gfw_wood_fiber';
                break;
            case 'logging':
                useTable = 'gfw_logging';
                break;
            default:
                this.throw(400, 'Name param invalid');
        }
        if(!useTable){
            this.throw(404, 'Name not found');
        }
        try{
            let data = yield GEEService.getUse(useTable, this.params.id, this.query.period, this.query.thresh);
            this.body = UseSerializer.serialize(data);
        } catch (err){
            logger.error(err);
            if(err instanceof NotFound){
                this.throw(404, 'WDPA not found');
                return;
            }
            throw err;
        }
    }

    static * wdpa(){
        logger.info('Obtaining wpda data with id %s', this.params.id);
        try{
            let data = yield GEEService.getWdpa(this.params.id, this.query.period, this.query.thresh);
            this.body = UseSerializer.serialize(data);
        } catch(err){
            logger.error(err);
            if(err instanceof NotFound){
                this.throw(404, 'WDPA not found');
                return;
            }
            throw err;
        }
    }

    static * world(){
        logger.info('Obtaining world data');
        this.assert(this.query.geostore, 400, 'geostore param required');
        let data = yield GEEService.getWorld(this.query.geostore, this.query.period, this.query.thresh);
        this.body = UseSerializer.serialize(data);
    }

}

var isCached =  function *(next){
    if (yield this.cashed()) {
        return;
    }
    yield next;
};


router.get('/admin/ifl/:iso', isCached,  UMDLossGainRouter.getIFLNational);
router.get('/admin/ifl/:iso/:id1', isCached, UMDLossGainRouter.getIFLSubnational);
router.get('/admin/:iso', isCached, UMDLossGainRouter.getNational);
router.get('/admin/:iso/:id1', isCached, UMDLossGainRouter.getSubnational);
router.get('/use/:name/:id', isCached, UMDLossGainRouter.use);
router.get('/wdpa/:id', isCached, UMDLossGainRouter.wdpa);
router.get('/', isCached, UMDLossGainRouter.world);


module.exports = router;
