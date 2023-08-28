import logger from 'logger';
import config from 'config';
import { RWAPIMicroservice } from "rw-api-microservice-node";

const getLocationString = ({ iso, adm1, adm2 }: Record<string, any>): string => `iso = '${iso}' ${adm1 ? `AND adm1 = ${adm1}` : ''} ${adm2 ? `AND adm2 = ${adm2}` : ''}`;

const getLocationVars = ({ adm1, adm2 }: Record<string, any>): string => `iso${adm1 ? `, adm1` : ''}${adm2 ? `, adm2` : ''},`;

const YEAR_QUERY: string = `SELECT {vars} year_data.year as year, SUM(year_data.area_loss) as area_loss, \
                SUM(year_data.carbon_emissions) as emissions, \
                SUM(year_data.biomass_loss) as biomass_loss \
                FROM data
                WHERE {location} \
                AND threshold = {threshold} \
                GROUP BY nested(year_data.year)`;

const BASE_QUERY: string = `SELECT {vars} SUM(total_area) AS area, SUM(total_gain) AS gain, \
                SUM(extent_2000) AS extent2000, SUM(extent_2010) AS extent2010, \
                SUM(weighted_biomass_per_ha) AS biomass_density \
                FROM data
                WHERE {location} \
                AND threshold = {threshold}`;


class ElasticService {

    static async getData(sqlTemplate: string, params: Record<string, any>, apiKey: string): Promise<Record<string, any>> {
        const { adm1, adm2 } = params;
        const sql: string = sqlTemplate.replace('{location}', getLocationString(params))
            .replace('{vars}', getLocationVars(params))
            .replace('{threshold}', params.thresh);
        logger.debug('Obtaining data with:', sql);
        let tableId: string = config.get('elasticTable.v3_adm2');
        if (!adm2 && adm1) {
            tableId = config.get('elasticTable.v3_adm1');
        } else if (!adm2) {
            tableId = config.get('elasticTable.v3_iso');
        }
        try {
            const result: Record<string, any> = await RWAPIMicroservice.requestToMicroservice({
                uri: `/v1/query/${tableId}?sql=${sql}`,
                method: 'GET',
                resolveWithFullResponse: true,
                headers: {
                    'x-api-key': apiKey
                }
            });
            logger.debug(result.body);
            return result.body;
        } catch (err) {
            logger.error(err);
            throw err;
        }
    }

    static getYearTotals(data: Record<string, any>, periods: Array<string>): Record<string, any> {
        const filtered: Array<Record<string, any>> = periods ? data.filter((year: Record<string, any>) => year.year >= periods[0] && year.year <= periods[1]) : data;
        const tmp: Record<string, any> = {
            loss: 0,
            emissions: 0,
            biomass_loss: 0
        };
        filtered.forEach((el: Record<string, any>) => {
            tmp.loss += el.area_loss;
            tmp.emissions += el.emissions;
            tmp.biomass_loss += el.biomass_loss;
        });
        return tmp;
    }

    static getYearArray(data: Record<string, any>, periods: Array<string>): Array<Record<string, any>> {
        const yearArray: Array<Record<string, any>> = data.yearData;
        const filtered: Array<Record<string, any>> = periods ? yearArray.filter((year: Record<string, any>) => year.year >= periods[0] && year.year <= periods[1]) : yearArray;
        return filtered.map((el: Record<string, any>) => ({
            year: el.year,
            loss: el.area_loss,
            emissions: el.emissions,
            biomassLoss: el.biomass_loss,
            lossPerc: 100 * el.area_loss / data.area,
            emissionsPerc: 100 * el.emissions / data.area,
            biomassLossPerc: 100 * el.biomass_loss / data.area
        }));
    }

    static getTotals(data: Record<string, any>, periods: Array<string>): Record<string, any> {
        const returnData: Record<string, any> = {
            extent2000: data.extent2000,
            extent2000Perc: 100 * data.extent2000 / data.area,
            extent2010: data.extent2010,
            extent2010Perc: 100 * data.extent2010 / data.area,
            biomassDensity: data.biomass_density,
            gain: data.gain,
            gainPerc: 100 * data.gain / data.area,
            areaHa: data.area
        };

        const yearTotals: Record<string, any> = ElasticService.getYearTotals(data.yearData, periods);
        const totalLoss: any = yearTotals.loss;
        const totalEmissions: any = yearTotals.emissions;
        const totalBiomassLoss: any = yearTotals.biomass_loss;
        returnData.loss = totalLoss;
        returnData.lossPerc = 100 * totalLoss / returnData.areaHa;
        returnData.emissions = totalEmissions;
        returnData.emissionsPerc = 100 * totalEmissions / returnData.areaHa;
        returnData.biomassLoss = totalBiomassLoss;
        returnData.biomassLossPerc = 100 * totalBiomassLoss / returnData.areaHa;
        return returnData;
    }

    async fetchData(params: Record<string, any>, apiKey: string): Promise<Record<string, any> | Array<void>> {
        let baseData: Record<string, any> = await ElasticService.getData(BASE_QUERY, params, apiKey);
        if (!baseData || !baseData.data || baseData.data.length === 0) {
            logger.error('No base data found.');
            baseData = [];
        }
        let yearData: Record<string, any> = await ElasticService.getData(YEAR_QUERY, params, apiKey);
        if (!yearData || !yearData.data || yearData.data.length === 0) {
            logger.error('No year data found.');
            yearData = [];
        }
        logger.info('Retrieved SQL response', baseData);

        const data: Record<string, any> = baseData.length === 0 || yearData.length === 0
            ? []
            : {
                yearData: yearData.data,
                area: baseData.data[0].area,
                extent2000: baseData.data[0].extent2000,
                extent2010: baseData.data[0].extent2010,
                biomass_density: baseData.data[0].biomass_density,
                gain: baseData.data[0].gain
            };
        const periodsYears: Array<string> = params.period.length ? [params.period[0].slice(0, 4), params.period[1].slice(0, 4)] : null;
        if (data && Object.keys(data).length > 0) {
            const totals: Record<string, any> = ElasticService.getTotals(data, periodsYears);
            return {
                totals,
                years: ElasticService.getYearArray(data, periodsYears),
                ...params
            };
        }

        return [];
    }

}

export default new ElasticService();
