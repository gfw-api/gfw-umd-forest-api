const nock = require('nock');
const chai = require('chai');
const fs = require('fs');
const { getTestServer } = require('../test-server');
const should = chai.should();
const requester = getTestServer();
nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);
describe('UMD Losstests', () => {
    before(() => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }
        nock.cleanAll();
    });
    it('Make a query to a fake level 2 region should return no data', async () => {
        nock(process.env.CT_URL)
            .get('/v1/query/82a317da-1fec-4bd0-b9d6-ebe786b9f269')
            .query({
                sql: 'SELECT iso, adm1, adm2, SUM(total_area) AS area, SUM(total_gain) AS gain,                 SUM(extent_2000) AS extent2000, SUM(extent_2010) AS extent2010,                 SUM(weighted_biomass_per_ha) AS biomass_density                 FROM data\n                WHERE iso = \'FOO\' AND adm1 = 1 AND adm2 = 1                 AND threshold = 30'
            })
            .reply(200, {
                data: []
            });
        nock(process.env.CT_URL)
            .get('/v1/query/82a317da-1fec-4bd0-b9d6-ebe786b9f269')
            .query({
                sql: 'SELECT iso, adm1, adm2, year_data.year as year, SUM(year_data.area_loss) as area_loss,                 SUM(year_data.carbon_emissions) as emissions,                 SUM(year_data.biomass_loss) as biomass_loss                 FROM data\n                WHERE iso = \'FOO\' AND adm1 = 1 AND adm2 = 1                 AND threshold = 30                 GROUP BY nested(year_data.year)'
            })
            .reply(500, {});
        const response = await requester
            .get(`/api/v3/umd-loss-gain/admin/foo/1/1`)
            .send();
        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.length(0);
    });
    it('Make a query to a real level 2 region should return ...', async () => {
        const jsonResponseBase = JSON.parse(fs.readFileSync(`${__dirname}/../data/BRA_base.json`, 'utf8'));
        const jsonResponseYear = JSON.parse(fs.readFileSync(`${__dirname}/../data/BRA_year.json`, 'utf8'));
        nock(process.env.CT_URL)
            .get('/v1/query/82a317da-1fec-4bd0-b9d6-ebe786b9f269')
            .query({
                sql: 'SELECT iso, adm1, adm2, SUM(total_area) AS area, SUM(total_gain) AS gain,                 SUM(extent_2000) AS extent2000, SUM(extent_2010) AS extent2010,                 SUM(weighted_biomass_per_ha) AS biomass_density                 FROM data\n                WHERE iso = \'BRA\' AND adm1 = 1 AND adm2 = 1                 AND threshold = 30'
            })
            .reply(200, jsonResponseBase);

        nock(process.env.CT_URL)
            .get('/v1/query/82a317da-1fec-4bd0-b9d6-ebe786b9f269')
            .query({
                sql: 'SELECT iso, adm1, adm2, year_data.year as year, SUM(year_data.area_loss) as area_loss,                 SUM(year_data.carbon_emissions) as emissions,                 SUM(year_data.biomass_loss) as biomass_loss                 FROM data\n                WHERE iso = \'BRA\' AND adm1 = 1 AND adm2 = 1                 AND threshold = 30                 GROUP BY nested(year_data.year)'
            })
            .reply(200, jsonResponseYear);
        const response = await requester
            .get(`/api/v3/umd-loss-gain/admin/BRA/1/1`)
            .send();
        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('object');
        response.body.data.should.have.property('attributes').and.be.an('object');
        response.body.data.should.have.property('id').and.equal('undefined');
        response.body.data.should.have.property('type').and.equal('umd-loss-gain');
        response.body.data.attributes.should.have.property('gadm').and.equal('3.6');
        response.body.data.attributes.should.have.property('period').and.be.an('array').and.length(0);
        response.body.data.attributes.should.have.property('years').and.be.an('array').and.length(18);
        response.body.data.attributes.should.have.property('iso').and.equal('BRA');
        response.body.data.attributes.should.have.property('adm1').and.equal('1');
        response.body.data.attributes.should.have.property('adm2').and.equal('1');
        response.body.data.attributes.should.have.property('thresh').and.equal('30');
        response.body.data.attributes.should.have.property('totals').and.be.an('object');
        response.body.data.attributes.totals.should.have.property('areaHa').and.equal(158570.5076035058);
        response.body.data.attributes.totals.should.have.property('extent2000').and.equal(122284.80057176348);
        response.body.data.attributes.totals.should.have.property('extent2000Perc').and.equal(77.11698878932006);
        response.body.data.attributes.totals.should.have.property('extent2010').and.equal(92075.59489374634);
        response.body.data.attributes.totals.should.have.property('extent2010Perc').and.equal(58.066027715554);
        response.body.data.attributes.totals.should.have.property('gain').and.equal(440.82270197906);
        response.body.data.attributes.totals.should.have.property('gainPerc').and.equal(0.2779979131310506);
        response.body.data.attributes.totals.should.have.property('gladAlerts').and.equal(null);
        response.body.data.attributes.totals.should.have.property('biomassDensity').and.equal(33080613.697113037);
        response.body.data.attributes.totals.should.have.property('loss').and.equal(57399.41572179645);
        response.body.data.attributes.totals.should.have.property('lossPerc').and.equal(36.19803996927322);
        response.body.data.attributes.totals.should.have.property('emissions').and.equal(28566265.504786015);
        response.body.data.attributes.totals.should.have.property('emissionsPerc').and.equal(18014.866658694136);
    });
    afterEach(() => {
        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }
    });
    after(() => {
    });
});