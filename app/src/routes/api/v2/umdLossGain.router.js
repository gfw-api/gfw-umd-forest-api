const Router = require('koa-router');

const router = new Router({
    prefix: '/umd-loss-gain'
});

class UMDLossGainRouterV2 {

    static fetchData() {
        this.throw(503, 'The umd-loss-gain v2 service no longer available.');
    }

}

const isCached = function* isCached(next) {
    if (yield this.cashed()) {
        return;
    }
    yield next;
};

router.get('/admin/:iso/:id1?/:id2?', isCached, UMDLossGainRouterV2.fetchData);

module.exports = router;
