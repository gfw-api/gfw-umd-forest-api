class InvalidPeriod extends Error {

    constructor(message: string) {
        super(message);
        this.name = 'Invalid Period';
        this.message = message;
    }

}

export default InvalidPeriod;
