const createConnector = require('kwildb_connector')
require(`dotenv`).config();

let credentials = {
    host: process.env.DATABASE_HOST,
    protocol: process.env.DATABASE_PROTOCOL,
    database: process.env.DATABASE_NAME,
    port: process.env.DATABASE_PORT,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    moat: process.env.DATA_MOAT
}
if (process.env.NODE_ENV == 'development') {
    credentials = {host: 'localhost',
      port: 5555,
      database: `postgres`,
      user: `postgres`,
      password: `password`,
      protocol:  `http`,
        moat: 'local'
    }
  }
const connector = createConnector(credentials)

module.exports = connector