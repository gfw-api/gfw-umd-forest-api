const { ROLES } = require('./test.constants');

const getUUID = () => Math.random().toString(36).substring(7);

module.exports = {
    getUUID
};
