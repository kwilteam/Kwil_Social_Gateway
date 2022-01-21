const rs = require('jsrsasign');
const knex = require('../../database/db.js');
const connector = require(`../../database/kwildb.js`)
const getGroupMembers = require('./getGroupModerators.js');
const getGroupOwner = require('./getGroupOwner.js');


// Returns public key based on inputted modulus parameter.
const createPubJWK = (_modulus) => {
    return {
        kty: 'RSA',
        n: _modulus,
        e: 'AQAB',
    };
};

/*
    Stringify data before / when you pass _data into checkSignature.
*/
// Returns boolean of whether the inputted modulus and data match the inputted signature parameter.
const checkSignature = (_data, _signature, _modulus) => {
    const pubJWK = createPubJWK(_modulus);
    const pubKey = rs.KEYUTIL.getKey(pubJWK);
    let sig = new rs.crypto.Signature({ alg: 'SHA256withRSA' });
    sig.init(pubKey);
    sig.updateString(_data);
    return sig.verify(_signature);
};

// Returns boolean based on whether a post's signature is valid.
const checkPostSig = async (_post) => {
    let queryResults = knex.select(`modulus`).from('users_lite').where({
        username: _post.data.username,
    }).toString();
    queryResults = await connector.query(queryResults)
    if (typeof queryResults[0] != 'undefined') {
        if (
            checkSignature(
                JSON.stringify(_post.data),
                _post.signature,
                queryResults[0].modulus
            )
        ) {
            return true;
        } else {
            return false;
        };
    };
    console.log('Modulus not found');
};

// Checks the publicity status of a group and retrieves a group poster's modulus.
// If the group is private, its moderator list is recorded and compared to the poster's username.
// If the poster is a group moderator, the post signature is verified.
// Only the signature is checked if the group is public.
const checkSignator = async (_post) => {
    let _res = knex('groups')
        .where({ group_name: _post.data.group_name })
        .select('public').toString();

    _res = await connector.query(_res)
    const publicity = _res[0].public;
    let queryResults = knex.select(`modulus`).from('users').where({
        username: _post.signator.username,
    }).toString();
    queryResults = await connector.query(queryResults)
    if (publicity == false) {
        const groupMembers = await getGroupMembers(_post.data.group_name)
        if (groupMembers.includes(_post.signator.username)) {
            // If the signator is in the group, check the sig.  Otherwise, return false
            return checkSignature(
                JSON.stringify(_post.data),
                _post.signator.signature,
                queryResults[0].modulus
            );
        } else {
            return false
        };
    } else {
        return checkSignature(
            JSON.stringify(_post.data),
            _post.signator.signature,
            queryResults[0].modulus
        );
    };
};

// This is the same as checkSignator, except it doesn't check whether a group is public or private.
// This is used for editing groups or adding mods. The other is used for posts.
const checkGroupSignator = async (_post) => {
    let queryResults = knex.select(`modulus`).from('users').where({
        username: _post.signator.username,
    }).toString();

    queryResults = await connector.query(queryResults)
    const groupMembers = await getGroupMembers(_post.data.group_name);
    const owner = await getGroupOwner(_post.data.group_name);
    if (groupMembers.includes(_post.signator.username) || _post.signator.username == owner) {
        // If the signator is in the group, check the sig. Otherwise, return false.
        return checkSignature(
            JSON.stringify(_post.data),
            _post.signator.signature,
            queryResults[0].modulus
        );
    } else {
        return false;
    };
};


module.exports = {
    checkSignature,
    createPubJWK,
    checkPostSig,
    checkGroupSignator,
    checkSignator,
};
