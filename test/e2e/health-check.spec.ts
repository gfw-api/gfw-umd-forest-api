import nock from 'nock';
import chai from 'chai';
import { getTestServer } from './utils/test-server';

chai.should();

let requester: ChaiHttp.Agent;

describe('GET healthcheck', () => {
    before(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }

        requester = await getTestServer();
    });

    it('Checking the application\'s health should return a 200', async () => {
        const response = await requester
            .get('/healthcheck');

        response.status.should.equal(200);
        response.body.should.be.an('object').and.have.property('uptime');
    });

    afterEach(() => {
        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }
    });
});
