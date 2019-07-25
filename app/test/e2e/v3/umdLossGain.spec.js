/* eslint-disable no-unused-vars,no-undef */
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

    it('Make a query to a fake level 1 region should return no data', async () => {
        nock(process.env.CT_URL)
            .get('/v1/query/10e124f0-3703-41e3-8136-492b131d5326')
            .query({
                sql: 'SELECT%20iso%2C%20SUM(total_area)%20AS%20area%2C%20SUM(total_gain)%20AS%20gain%2C%20%20SUM(extent_2000)%20AS%20extent2000%2C%20SUM(extent_2010)%20AS%20extent2010%2C%20SUM(weighted_biomass_per_ha)%20AS%20biomass_density%20%20FROM%20data%20WHERE%20iso%3D%27XXX%27%20%20AND%20threshold%20%3D%2030'
            })
            .reply(500, {
                "data": [],
                "meta": {
                    "cloneUrl": {
                        "http_method": "POST",
                        "url": "/v1/dataset/10e124f0-3703-41e3-8136-492b131d5326/clone",
                        "body": {
                            "dataset": {
                                "datasetUrl": "/v1/query/10e124f0-3703-41e3-8136-492b131d5326?sql=SELECT%20iso%2C%20SUM%28total_area%29%20AS%20area%2C%20SUM%28total_gain%29%20AS%20gain%2C%20SUM%28extent_2000%29%20AS%20extent2000%2C%20SUM%28extent_2010%29%20AS%20extent2010%2C%20SUM%28weighted_biomass_per_ha%29%20AS%20biomass_density%20FROM%20data%20WHERE%20iso%3D%27foo%27%20AND%20threshold%20%3D%2030",
                                "application": [
                                    "your",
                                    "apps"
                                ]
                            }
                        }
                    }
                }
            });

        const response = await requester
            .get(`/api/v3/umd-loss-gain/admin/foo`)
            .send();

        response.status.should.equal(500);
    });

    // it('Make a query to a real level 1 region should return ...', async () => {
    //     const jsonResponse = JSON.parse(fs.readFileSync(`${__dirname}/../data/BRA.json`, 'utf8'));

    //     nock(process.env.CT_URL)
    //         .get('/v1/query/10e124f0-3703-41e3-8136-492b131d5326')
    //         .query({ sql: "SELECT iso, SUM(total_area) AS area, SUM(total_gain) AS gain,  SUM(extent_2000) AS extent2000, SUM(extent_2010) AS extent2010, SUM(weighted_biomass_per_ha) AS biomass_density  FROM data WHERE iso='BRA'  AND threshold = 30" })
    //         .reply(200, jsonResponse);

    //     const response = await requester
    //         .get(`/api/v3/umd-loss-gain/admin/BRA`)
    //         .send();

    //     response.status.should.equal(200);
    //     response.body.should.have.property('data').and.be.an('object');
    //     response.body.data.should.have.property('attributes').and.be.an('object');
    //     response.body.data.should.have.property('id').and.equal('undefined');
    //     response.body.data.should.have.property('type').and.equal('umd-loss-gain');

    //     response.body.data.attributes.should.have.property('gadm').and.equal('3.6');
    //     response.body.data.attributes.should.have.property('period').and.be.an('array').and.length(0);
    //     response.body.data.attributes.should.have.property('years').and.be.an('array').and.length(18);
    //     response.body.data.attributes.should.have.property('iso').and.equal('BRA');
    //     response.body.data.attributes.should.have.property('polyname').and.equal('admin');
    //     response.body.data.attributes.should.have.property('thresh').and.equal('30');
    //     response.body.data.attributes.should.have.property('totals').and.be.an('object');

    //     response.body.data.attributes.totals.should.have.property('areaHa').and.equal(850035649.7393854);
    //     response.body.data.attributes.totals.should.have.property('extent2000').and.equal(519187508.445711);
    //     response.body.data.attributes.totals.should.have.property('extent2000Perc').and.equal(61.07832166861355);
    //     response.body.data.attributes.totals.should.have.property('extent2010').and.equal(498198381.95378244);
    //     response.body.data.attributes.totals.should.have.property('extent2010Perc').and.equal(58.60911623018709);
    //     response.body.data.attributes.totals.should.have.property('gain').and.equal(7586758.106451291);
    //     response.body.data.attributes.totals.should.have.property('gainPerc').and.equal(0.8925223440660794);
    //     response.body.data.attributes.totals.should.have.property('gladAlerts').and.equal(null);
    //     response.body.data.attributes.totals.should.have.property('biomassDensity').and.equal(118326137296.57202);
    //     response.body.data.attributes.totals.should.have.property('loss').and.equal(53837550.56402553);
    //     response.body.data.attributes.totals.should.have.property('lossPerc').and.equal(6.333563842943731);
    //     response.body.data.attributes.totals.should.have.property('emissions').and.equal(18308559246.055298);
    //     response.body.data.attributes.totals.should.have.property('emissionsPerc').and.equal(2153.857811924543);
    // });

    afterEach(() => {
        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }
    });

    after(() => {
    });
});
