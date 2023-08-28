import Router from 'koa-router';
import { Context, Next } from 'koa';

const routerV2: Router = new Router({
    prefix: '/api/v2/umd-loss-gain'
});

class UMDLossGainRouterV2 {

    static fetchData(ctx: Context): Promise<void> {
        ctx.throw(503, 'The umd-loss-gain v2 service no longer available.');
    }

}

const isCached = async (ctx: Context, next: Next): Promise<void> => {
    if (await ctx.cashed()) {
        return;
    }
    await next();
};

routerV2.get('/admin/:iso/:id1?/:id2?', isCached, UMDLossGainRouterV2.fetchData);

export default routerV2;
