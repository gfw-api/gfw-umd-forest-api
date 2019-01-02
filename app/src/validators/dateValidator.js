'use strict';

const logger = require('logger');
const moment = require('moment');
const InvalidPeriod = require('errors/invalidPeriod');

const DATE_FORMAT = 'YYYY-MM-DD';

class DateValidator {

    static validatePeriod(period) {

        if (period.length && (!moment(period[0], DATE_FORMAT, true).isValid() || !moment(period[1], DATE_FORMAT, true).isValid())) {
            logger.error('Period must be in the format: YYYY-MM-DD,YYYY-MM-DD');
            throw new InvalidPeriod('Period must be in the format: YYYY-MM-DD,YYYY-MM-DD');
        } else if (period.length && (moment(period[0]).isAfter(moment(period[1])))) {
            logger.error('Start date must be before end date!');
            throw new InvalidPeriod('Start date must be before end date!');
        } else {
            return true;
        }
    }

}

module.exports = DateValidator;
