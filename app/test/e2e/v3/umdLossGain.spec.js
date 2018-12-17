/* eslint-disable no-unused-vars,no-undef */
const nock = require('nock');
const chai = require('chai');
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

    it('Create a CARTO DB dataset should be successful', async () => {
        const response = await requester
            .get(`/api/v3/umd-loss-gain/admin/foo`)
            .send();

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('object');
    });


    afterEach(() => {
        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }
    });

    after(() => {
    });
});
