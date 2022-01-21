const createConnector = require('kwildb_connector')
const connector = createConnector(
    {
        host: process.env.DATABASE_HOST,
        protocol: process.env.DATABASE_PROTOCOL,
        database: process.env.DATABASE_NAME,
        port: process.env.DATABASE_PORT,
        user: process.env.DATABASE_USER,
        password: process.env.DATABASE_PASSWORD,
        moat: process.env.DATA_MOAT
    })

module.exports = connector