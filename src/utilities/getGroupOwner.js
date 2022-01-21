const knex = require('../../database/db.js');
const connector = require(`../../database/kwildb.js`)

// Returns the account's username that owns the inputted group.
const getGroupOwner = async (_group) => {
    let results = await knex('groups')
        .select('group_owner')
        .where({ group_name: _group }).toString()
    results = await connector.query(results)
    return results[0].group_owner
};


module.exports = getGroupOwner;