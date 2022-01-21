const knex = require('../../database/db.js');


// Returns a user's list of groups they follow.
const getGroupFollowing = async (_username) => {
    const following = await knex('group_followers').select('group_name').where({
        follower: _username,
    });
    const followingList = [];
    for (i = 0; i < following.length; i++) {
        followingList.push(following[i].group_name);
    };
    return followingList;
};

// Returns the raw data for the dataset returned in getGroupFollowing.
const getGroupFollowingRaw = async (_username) => {
    const following = await knex('group_followers').select('group_name').where({
        follower: _username,
    });
    return following;
};


module.exports = { getGroupFollowing, getGroupFollowingRaw };
