const knex = require('./database/db.js')

const testF = async () => {
    const yuh = await knex('bundles').select('synced').toString()
    console.log(yuh)
}
//testF()