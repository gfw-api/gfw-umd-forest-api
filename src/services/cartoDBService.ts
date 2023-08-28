import config from 'config';
import logger from 'logger';
import Mustache from 'mustache';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import CartoDB from 'cartodb';


const IFL: string = `SELECT iso, country, ifl_loss, ifl_loss_perc, ifl_treecover_2000, threshold, year 
            FROM loss_analysis_ifl 
            WHERE iso = UPPER('{{iso}}') 
                AND id1 is null 
                AND threshold = {{thresh}}`;

const IFL_ID1: string = `SELECT iso, country, ifl_loss, ifl_loss_perc, ifl_treecover_2000, threshold, year, id1
                FROM loss_analysis_ifl 
                WHERE iso = UPPER('{{iso}}') 
                AND id1 = {{id1}} 
                AND threshold = {{thresh}}`;

const ISO: string = `SELECT iso, country, year, thresh, extent_2000 as extent, extent_perc, 
            loss, loss_perc, gain, gain as total_gain, gain_perc, land as area_ha, 
            max(year) OVER () max_year, 
            min(year) OVER () min_year 
            FROM umd_nat_staging 
            WHERE iso = UPPER('{{iso}}') 
              AND thresh = {{thresh}} 
              ORDER BY year`;

const ID1: string = `SELECT iso, country, region, year, thresh, extent_2000 as extent, 
             extent_perc, loss, loss_perc, gain, gain as total_gain, 
             gain_perc, id1, land as area_ha, 
             max(year) OVER () max_year, 
             min(year) OVER () min_year 
             FROM umd_subnat_staging 
             WHERE iso = UPPER('{{iso}}') 
                AND thresh = {{thresh}} 
                AND id1 = {{id1}} 
             ORDER BY year`;

const executeThunk = async (client: CartoDB.SQL, sql: string, params: any): Promise<Record<string, any>> => (new Promise((resolve: (value: (PromiseLike<unknown> | unknown)) => void, reject: (reason?: any) => void) => {
    logger.debug(Mustache.render(sql, params));
    client.execute(sql, params).done((data: Record<string, any>) => {
        resolve(data);
    }).error((error: Error) => {
        reject(error);
    });
}));

class CartoDBService {

    client: CartoDB.SQL;

    constructor() {
        this.client = new CartoDB.SQL({
            user: config.get('cartoDB.user')
        });
    }

    async getIFLNational(iso: string, thresh: string): Promise<Array<any>> {
        const data: Record<string, any> = await executeThunk(this.client, IFL, {
            iso,
            thresh
        });
        return data.rows;
    }

    async getIFLSubnational(iso: string, id1: string, thresh: string): Promise<Array<any>> {
        const data: Record<string, any> = await executeThunk(this.client, IFL_ID1, {
            iso,
            id1,
            thresh
        });
        return data.rows;
    }

    async getNational(iso: string, thresh: string, period: string): Promise<Record<string, any>> {
        const data: Record<string, any> = await executeThunk(this.client, ISO, {
            iso,
            thresh
        });
        if (data.rows && data.rows.length > 0) {
            const periods: string[] = period ? period.split(',') : [String(data.rows[0].min_year), String(data.rows[0].max_year)];

            const initYear: number = new Date(periods[0]).getFullYear();
            const lastYear: number = new Date(periods[1]).getFullYear();
            const single: Record<string, any> = {
                loss: 0,
                gain: 0,
                tree_extent: 0,
                area_ha: 0
            };
            for (let i: number = 0, { length } = data.rows; i < length; i++) {
                if (data.rows[i].year >= initYear && data.rows[i].year <= lastYear) {
                    if (data.rows[i].loss) {
                        single.loss += data.rows[i].loss;
                    }
                    if (data.rows[i].total_gain) {
                        single.gain = data.rows[i].total_gain;
                    }
                    if (data.rows[i].extent) {
                        single.tree_extent = data.rows[i].extent;
                    }
                    if (data.rows[i].area_ha) {
                        single.area_ha = data.rows[i].area_ha;
                    }
                }
            }
            return {
                total: single,
                years: data.rows
            };
        }
        return { years: data.rows };

    }

    async getSubnational(iso: string, id1: string, thresh: string, period: string): Promise<Record<string, any>> {
        const data: Record<string, any> = await executeThunk(this.client, ID1, {
            iso,
            id1,
            thresh
        });
        if (data.rows && data.rows.length > 0) {
            const periods: string[] = period ? period.split(',') : [String(data.rows[0].min_year), String(data.rows[0].max_year)];

            const initYear: number = new Date(periods[0]).getFullYear();
            const lastYear: number = new Date(periods[1]).getFullYear();
            const single: Record<string, any> = {
                loss: 0,
                gain: 0,
                tree_extent: 0,
                area_ha: 0
            };
            for (let i: number = 0, { length } = data.rows; i < length; i++) {
                if (data.rows[i].year >= initYear && data.rows[i].year <= lastYear) {
                    if (data.rows[i].loss) {
                        single.loss += data.rows[i].loss;
                    }
                    if (data.rows[i].total_gain) {
                        single.gain = data.rows[i].total_gain;
                    }
                    if (data.rows[i].extent) {
                        single.tree_extent = data.rows[i].extent;
                    }
                    if (data.rows[i].area_ha) {
                        single.area_ha = data.rows[i].area_ha;
                    }
                }
            }
            return {
                total: single,
                years: data.rows
            };
        }
        return { years: data.rows };
    }

}

export default new CartoDBService();
