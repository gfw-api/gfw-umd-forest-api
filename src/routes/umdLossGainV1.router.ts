import Router from 'koa-router';
import logger from 'logger';
import { Context, Next } from 'koa';
import CartoDBService from "services/cartoDBService";
import UMDIFLSerializer from "serializers/umdIflSerializer";
import UMDSerializer from "serializers/umdSerializer";
import GeostoreService from "services/geostoreService";

const routerV1: Router = new Router({
    prefix: '/api/v1/umd-loss-gain'
});

class UmdLossGainRouter {

    static async getIFLNational(ctx: Context): Promise<void> {
        logger.info('Obtaining ifl national data');
        const thresh: string = (ctx.query.thresh as string) || '30';
        const data: Array<any> = await CartoDBService.getIFLNational(ctx.params.iso, thresh);
        ctx.body = UMDIFLSerializer.serialize(data);
    }

    static async getIFLSubnational(ctx: Context): Promise<void> {
        logger.info('Obtaining ifl subnational data');
        const thresh: string = (ctx.query.thresh as string) || '30';
        const data: Array<any> = await CartoDBService.getIFLSubnational(ctx.params.iso, ctx.params.id1, thresh);
        ctx.body = UMDIFLSerializer.serialize(data);
    }

    static async getNational(ctx: Context): Promise<void> {
        logger.info('Obtaining national data');
        const thresh: string = (ctx.query.thresh as string) || '30';
        const data: Record<string, any> = await CartoDBService.getNational(
            ctx.params.iso,
            thresh,
            ctx.query.period as string
        );
        const dataArea: Record<string, any> = await GeostoreService.getGeostoreByIso(
            ctx.params.iso,
            ctx.request.headers['x-api-key'] as string
        );
        data.total.area_ha = dataArea.areaHa;
        // eslint-disable-next-line no-return-assign
        data.years.map((el: Record<string, any>) => el.area_ha = dataArea.areaHa);
        ctx.body = UMDSerializer.serialize(data);
    }

    static async getSubnational(ctx: Context): Promise<void> {
        logger.info('Obtaining subnational data');
        const thresh: string = (ctx.query.thresh as string) || '30';
        const data: Record<string, any> = await CartoDBService.getSubnational(ctx.params.iso, ctx.params.id1, thresh, ctx.query.period as string);
        const dataArea: Record<string, any> = await GeostoreService.getGeostoreByIsoAndId(
            ctx.params.iso,
            ctx.params.id1,
            ctx.request.headers['x-api-key'] as string
        );
        data.total.area_ha = dataArea.areaHa;
        // eslint-disable-next-line no-return-assign
        data.years.map((el: Record<string, any>) => el.area_ha = dataArea.areaHa);
        ctx.body = UMDSerializer.serialize(data);
    }

}

const isCached = async (ctx: Context, next: Next): Promise<void> => {
    if (await ctx.cashed()) {
        return;
    }
    await next();
};

routerV1.get('/admin/ifl/:iso', isCached, UmdLossGainRouter.getIFLNational);
routerV1.get('/admin/ifl/:iso/:id1', isCached, UmdLossGainRouter.getIFLSubnational);
routerV1.get('/admin/:iso', isCached, UmdLossGainRouter.getNational);
routerV1.get('/admin/:iso/:id1', isCached, UmdLossGainRouter.getSubnational);

export default routerV1;
