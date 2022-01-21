const knex = require('../../database/db.js');
const connector = require(`../../database/kwildb.js`)

// Returns a group's moderator account usernames.
const getGroupModerators = async (_group) => {
    let results = knex('groups')
        .select('moderators')
        .where({ group_name: _group }).toString();
    results = await connector.query(results)
    return results[0].moderators;
};


module.exports = getGroupModerators;
