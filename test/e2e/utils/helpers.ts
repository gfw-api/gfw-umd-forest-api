import { mockCloudWatchLogRequest, mockValidateRequest } from "rw-api-microservice-node/dist/test-mocks";
import { ApplicationValidationResponse } from "rw-api-microservice-node/dist/types";
import config from 'config';

const APPLICATION: ApplicationValidationResponse = {
    data: {
        type: "applications",
        id: "649c4b204967792f3a4e52c9",
        attributes: {
            name: "grouchy-armpit",
            organization: null,
            user: null,
            apiKeyValue: "a1a9e4c3-bdff-4b6b-b5ff-7a60a0454e13",
            createdAt: "2023-06-28T15:00:48.149Z",
            updatedAt: "2023-06-28T15:00:48.149Z"
        }
    }
};

export const mockValidateRequestWithApiKey = ({
                                                  apiKey = 'api-key-test',
                                                  application = APPLICATION
                                              }) => {
    mockValidateRequest({
        gatewayUrl: process.env.GATEWAY_URL,
        microserviceToken: process.env.MICROSERVICE_TOKEN,
        application,
        apiKey
    });
    mockCloudWatchLogRequest({
        application,
        awsRegion: process.env.AWS_REGION,
        logGroupName: process.env.CLOUDWATCH_LOG_GROUP_NAME,
        logStreamName: config.get('service.name')
    });
};
