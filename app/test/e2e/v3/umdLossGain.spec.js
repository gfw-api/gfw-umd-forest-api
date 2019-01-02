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
            .get('/v1/query/a20e9c0e-8d7d-422f-90f5-3b9bca355aaf')
            .query({
                sql: 'SELECT iso, area_extent AS extent2010, area_extent_2000 AS extent2000,                 area_admin AS area, year_data AS loss_data, area_gain AS gain                 FROM data\n                WHERE iso = \'FOO\'                   AND thresh = 30                 AND polyname = \'admin\''
            })
            .reply(200, {
                data: [],
                meta: {
                    cloneUrl: {
                        http_method: 'POST',
                        url: '/v1/dataset/a20e9c0e-8d7d-422f-90f5-3b9bca355aaf/clone',
                        body: {
                            dataset: {
                                datasetUrl: '/v1/query/a20e9c0e-8d7d-422f-90f5-3b9bca355aaf?sql=SELECT%20iso%2C%20area_extent%20AS%20extent2010%2C%20area_extent_2000%20AS%20extent2000%2C%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20area_admin%20AS%20area%2C%20year_data%20AS%20loss_data%2C%20area_gain%20AS%20gain%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20FROM%20data%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20WHERE%20iso%20%3D%20%27FOO%27%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20AND%20thresh%20%3D%2030%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20AND%20polyname%20%3D%20%27admin%27',
                                application: [
                                    'your',
                                    'apps'
                                ]
                            }
                        }
                    }
                }
            });

        const response = await requester
            .get(`/api/v3/umd-loss-gain/admin/foo`)
            .send();

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.length(0);
    });

    it('Make a query to a real level 1 region should return ...', async () => {
        const jsonResponse = JSON.parse(fs.readFileSync(`${__dirname}/../data/BRA.json`, 'utf8'));

        nock(process.env.CT_URL)
            .get('/v1/query/a20e9c0e-8d7d-422f-90f5-3b9bca355aaf')
            .query({ sql: 'SELECT iso, area_extent AS extent2010, area_extent_2000 AS extent2000,                 area_admin AS area, year_data AS loss_data, area_gain AS gain                 FROM data\n                WHERE iso = \'BRA\'                   AND thresh = 30                 AND polyname = \'admin\'' })
            .reply(200, jsonResponse);

        const response = await requester
            .get(`/api/v3/umd-loss-gain/admin/BRA`)
            .send();

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('object');
        response.body.data.should.have.property('attributes').and.be.an('object');
        response.body.data.should.have.property('id').and.equal('undefined');
        response.body.data.should.have.property('type').and.equal('umd-loss-gain');

        response.body.data.attributes.should.have.property('gadm').and.equal('3.6');
        response.body.data.attributes.should.have.property('period').and.be.an('array').and.length(0);
        response.body.data.attributes.should.have.property('years').and.be.an('array').and.length(17);
        response.body.data.attributes.should.have.property('iso').and.equal('BRA');
        response.body.data.attributes.should.have.property('polyname').and.equal('admin');
        response.body.data.attributes.should.have.property('thresh').and.equal('30');
        response.body.data.attributes.should.have.property('totals').and.be.an('object');

        response.body.data.attributes.totals.should.have.property('areaHa').and.equal(850033226.9293736);
        response.body.data.attributes.totals.should.have.property('extent2000').and.equal(519187505.31198174);
        response.body.data.attributes.totals.should.have.property('extent2000Perc').and.equal(61.07849538864194);
        response.body.data.attributes.totals.should.have.property('extent2010').and.equal(403563389.77766067);
        response.body.data.attributes.totals.should.have.property('extent2010Perc').and.equal(47.47618998794636);
        response.body.data.attributes.totals.should.have.property('gain').and.equal(7586758.0405376665);
        response.body.data.attributes.totals.should.have.property('gainPerc').and.equal(0.8925248802265966);
        response.body.data.attributes.totals.should.have.property('gladAlerts').and.equal(null);
        response.body.data.attributes.totals.should.have.property('loss').and.equal(50889088.66974591);
        response.body.data.attributes.totals.should.have.property('lossPerc').and.equal(5.986717584390863);
    });

    afterEach(() => {
        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }
    });

    after(() => {
    });
});
