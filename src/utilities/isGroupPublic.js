const knex = require('../../database/db.js');
const connector = require('../../database/kwildb.js')


// Returns a boolean based on a group's publicity status.
const isGroupPublic = async (_group) => {
    try {

    
    let results = knex('groups')
        .select('public')
        .where({ group_name: _group }).toString();
    results = await connector.query(results)
    return results[0].public;
    } catch(e) {
        console.log(e)
        return true //should just return empty to client.  This triggers if the group doesnt exist
    }
};


module.exports = isGroupPublic;
