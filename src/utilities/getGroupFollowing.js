const knex = require('../../database/db.js');
const connector = require('../../database/kwildb.js')


// Returns a user's list of groups they follow.
const getGroupFollowing = async (_username) => {
    let following = knex('group_followers').select('group_name').where({
        follower: _username,
    }).toString();
    following = connector.query(following)
    const followingList = [];
    for (let i = 0; i < following.length; i++) {
        followingList.push(following[i].group_name);
    };
    return followingList;
};

// Returns the raw data for the dataset returned in getGroupFollowing.
const getGroupFollowingRaw = async (_username) => {
    let following = knex('group_followers').select('group_name').where({
        follower: _username,
    }).toString();
    following = await connector.query(following)
    console.log(following)
    return following;
};


module.exports = { getGroupFollowing, getGroupFollowingRaw };
