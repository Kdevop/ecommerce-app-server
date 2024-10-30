const dotenv = require('dotenv');
dotenv.config({ path: '/.env' });

module.exports = {
    PORT: process.env.PORT,
    DB: {
        DB_USER: process.env.DB_USER,
        DB_PASSWORD: process.env.DB_PASSWORD,
        DB_HOST: process.env.DB_HOST,
        DB_PORT: process.env.DB_PORT,
        DB_DATABASE: process.env.DB_DATABASE,
    },
    SS: {
        SS_SESS_LIFETIME: process.env.SESS_LIFETIME,
        SS_NODE_ENV: process.env.NODE_ENV,
        SS_SESS_SECRET: process.env.SESS_SECRET,
        SS_SESS_NAME: process.env.SESS_NAME   
    }
};

