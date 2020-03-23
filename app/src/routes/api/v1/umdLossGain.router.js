const Router = require('koa-router');
const logger = require('logger');
const CartoDBService = require('services/cartoDBService');
const GeostoreService = require('services/geostoreService');
const UMDIFLSerializer = require('serializers/umdIflSerializer');
const UMDSerializer = require('serializers/umdSerializer');

const router = new Router({
    prefix: '/umd-loss-gain'
});

class UmdLossGainRouter {

    static* getIFLNational() {
        logger.info('Obtaining ifl national data');
        const thresh = this.query.thresh || '30';
        const data = yield CartoDBService.getIFLNational(this.params.iso, thresh);
        this.body = UMDIFLSerializer.serialize(data);
    }

    static* getIFLSubnational() {
        logger.info('Obtaining ifl subnational data');
        const thresh = this.query.thresh || '30';
        const data = yield CartoDBService.getIFLSubnational(this.params.iso, this.params.id1, thresh);
        this.body = UMDIFLSerializer.serialize(data);
    }

    static* getNational() {
        logger.info('Obtaining national data');
        const thresh = this.query.thresh || '30';
        const data = yield CartoDBService.getNational(this.params.iso, thresh, this.query.period);
        const dataArea = yield GeostoreService.getGeostoreByIso(this.params.iso);
        data.total.area_ha = dataArea.areaHa;
        // eslint-disable-next-line no-return-assign
        data.years.map((el) => el.area_ha = dataArea.areaHa);
        this.body = UMDSerializer.serialize(data);
    }

    static* getSubnational() {
        logger.info('Obtaining subnational data');
        const thresh = this.query.thresh || '30';
        const data = yield CartoDBService.getSubnational(this.params.iso, this.params.id1, thresh, this.query.period);
        const dataArea = yield GeostoreService.getGeostoreByIsoAndId(this.params.iso, this.params.id1);
        data.total.area_ha = dataArea.areaHa;
        // eslint-disable-next-line no-return-assign
        data.years.map((el) => el.area_ha = dataArea.areaHa);
        this.body = UMDSerializer.serialize(data);
    }

}

const isCached = function* isCached(next) {
    if (yield this.cashed()) {
        return;
    }
    yield next;
};

router.get('/admin/ifl/:iso', isCached, UmdLossGainRouter.getIFLNational);
router.get('/admin/ifl/:iso/:id1', isCached, UmdLossGainRouter.getIFLSubnational);
router.get('/admin/:iso', isCached, UmdLossGainRouter.getNational);
router.get('/admin/:iso/:id1', isCached, UmdLossGainRouter.getSubnational);

module.exports = router;
