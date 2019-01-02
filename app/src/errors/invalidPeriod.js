'use strict';

class InvalidPeriod extends Error {

    constructor(message) {
        super(message);
        this.name = 'Invalid Period';
        this.message = message;
    }
}

module.exports = InvalidPeriod;
