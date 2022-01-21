const knex = require('../../database/db.js');


// Returns a boolean based on a group's publicity status.
const isGroupPublic = async (_group) => {
    const results = await knex('groups')
        .select('public')
        .where({ group_name: _group });
    return results[0].public;
};


module.exports = isGroupPublic;
