import Router from 'koa-router';
import logger from 'logger';
import config from 'config';
import { Context, Next } from 'koa';
import InvalidPeriod from "errors/invalidPeriod";
import DateValidator from "validators/dateValidator";
import ElasticSerializer from "serializers/elasticSerializer";
import GladAlertsService from "services/gladAlertsService";
import ElasticService from "services/elasticService";

const routerV3: Router = new Router({
    prefix: '/api/v3/umd-loss-gain'
});
const GADM: string = '3.6';

class UMDLossGainRouterV3 {

    static async fetchData(ctx: Context): Promise<void> {
        logger.info('Obtaining data for', ctx.params);
        const thresh: string = (ctx.query.thresh as string) || '30';
        const period: string[] = ctx.query.period ? (ctx.query.period as string).split(',').map((el: string) => el.trim()) : [];
        const iso: string = (ctx.params.iso as string) || null;
        const id1: string = (ctx.params.id1 as string) || null;
        const id2: string = (ctx.params.id2 as string) || null;
        logger.info(`Obtaining data for ${iso}, ${id1}, ${id2}`);
        try {
            let glads: number | void = null;
            if (period.length && DateValidator.validatePeriod(period) && (config.get('gladWhitelist.iso') as string[]).includes(iso)) {
                glads = await GladAlertsService.fetchData({
                        iso: iso.toUpperCase(),
                        adm1: id1,
                        adm2: id2,
                        thresh,
                        period
                    },
                    ctx.request.headers['x-api-key'] as string
                );
            }
            const data: Record<string, any> | Array<void> = await ElasticService.fetchData({
                    iso: iso.toUpperCase(),
                    adm1: id1,
                    adm2: id2,
                    thresh,
                    period,
                    gadm: GADM
                },
                ctx.request.headers['x-api-key'] as string
            );
            if (data) {
                if ((data as Record<string, any>).totals) (data as Record<string, any>).totals.gladAlerts = glads;
                (data as Record<string, any>).downloadUrls = {
                    url: 'https://earthenginepartners.appspot.com/science-2013-global-forest',
                    xlsx: `https://gfw2-data.s3.amazonaws.com/country-pages/country_stats/download/${iso}.xlsx`
                };
            }
            ctx.body = ElasticSerializer.serialize(data);

        } catch (err) {
            logger.error(err);
            if (err instanceof InvalidPeriod) {
                ctx.throw(400, err.message);
                return;
            }
            // just return a generic error if an error is caught but not identified
            ctx.throw(500, 'Internal Server Error');

        }
    }

}

const isCached = async (ctx: Context, next: Next): Promise<void> => {
    if (await ctx.cashed()) {
        return;
    }
    await next();
};

routerV3.get('/admin/:iso/:id1?/:id2?', isCached, UMDLossGainRouterV3.fetchData);

export default routerV3;
