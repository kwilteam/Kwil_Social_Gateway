require(`dotenv`).config();
const fs = require('fs');
const connector = require('./kwildb.js')

// This function is used in server.js.
const pgStartup = async () => {
    try {
        // Connects server to database.
        const initSQL = fs.readFileSync('./database/init.sql').toString();
        // Creates database tables if they don't exist and logs successful connection.
        const b = await connector.query(initSQL, false);
        console.log('Connected to database');

    } catch (e) {
        console.log(e);
    };
};


module.exports = pgStartup
