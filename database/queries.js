const client = require('./kwildb.js')
require(`dotenv`).config();


// Adds accounts to always followed array.
let alwaysFollowed = process.env.ALWAYS_FOLLOWED.split(" ");

// If there are no mandatory followers the always followed array will be empty.
if (alwaysFollowed[0].length == 0) {
    alwaysFollowed = [];
};

// Gets group posts exclusive to inputted usernames.
const getExclusiveGroupPosts = async (
    _group,
    _usernameArr,
    _lim = 20,
    _cursor = new Date()
) => {
    const queryArr = [_group];
    _cursor = _cursor.getTime();
    let sql =
        `SELECT post_id, post_title, post_text, post_time, post_type, username, group_name, photo_hash FROM posts WHERE group_name LIKE '${_group}' AND `;
    for (let i = 0; i < _usernameArr.length; i++) {
        queryArr.push(_usernameArr[i]);
        if (i == 0) {
            sql = sql + `(username LIKE '${_usernameArr[0]}'`;
        } else {
            sql = sql + ` OR username LIKE '${_usernameArr[i]}'`;
        };
    };
    sql =
        sql +
        `) AND post_time <= to_timestamp(${_cursor}) ORDER BY post_time DESC LIMIT ` +
        _lim;
    const results = await client.query(sql);
    return results;
};

// Returns a user's feed data.
const getFeedQuery = async (
    _username,
    _following,
    _groups,
    _lim = 20,
    _time
) => {
    let queryArr = [...alwaysFollowed]; //Use spread operator to copy
    let sql = `SELECT post_id, post_title, post_text, post_time, post_type, username, group_name, photo_hash FROM posts WHERE post_time < to_timestamp(${
        _time / 1000
    }) AND (username LIKE '${_username}'`;
    
    let j = 1 //This is the $ value
    //We will now loop through and add to the SQL the necessary info
    queryArr.forEach(person => {
        j++
        sql = sql + ` OR username LIKE '${person}'`
    })
    queryArr.push(_username); //I add this after since if I add it before, it is double counted (since we have "AND username LIKE $1" in the SQL statement)

    //Now I need to loop through for _following
    _following.forEach(follow => {
        j++
        queryArr.push(follow.followee)
        sql = sql + ` OR username LIKE '${follow}'`
    })

    //Now I need to loop through for groups
    _groups.forEach(group => {
        j++
        queryArr.push(group.group_name)
        sql = sql + ` OR group_name LIKE '${group}'`
    })

    sql = sql + ') ORDER BY post_time DESC LIMIT ' + _lim;
    console.log(sql)
    console.log(queryArr)
    const results = await client.query(sql);
    return results;
};

/*
    Only call getFeedGroupsOnlyQuery if the user follows a group.  Check before calling.
*/
// Returns groups feed.
const getFeedGroupsOnlyQuery = async (_groups, _lim, _time) => {
    const queryArr = [];
    let sql = `SELECT post_id, post_title, post_text, post_time, post_type, username, group_name, photo_hash FROM posts WHERE post_time < to_timestamp(${
        _time / 1000
    }) AND (`;
    for (let i=0;i<_groups.length;i++) {
        queryArr.push(_groups[i].group_name);
        sql = sql + `group_name LIKE '${_groups[i].group_name}'`;
        if (i != _groups.length-1) {
            sql = sql + ' OR ';
        };
    };
    sql = sql + ') ORDER BY post_time DESC LIMIT ' + _lim;
    const results = await client.query(sql);
    return results;
};

/*
    Only call getFeedUsersOnlyQuery if the user follows another user.  Check before calling.
*/
// Returns users feed.
const getFeedUsersOnlyQuery = async (_users, _lim, _time) => {
    let queryArr = [...alwaysFollowed]; //Use spread operator to copy
    queryArr = queryArr.concat(_users);
    let sql = `SELECT post_id, post_title, post_text, post_time, post_type, username, group_name, photo_hash FROM posts WHERE post_time < to_timestamp(${
        _time / 1000
    }) AND (username LIKE '${_users[0]}'`;

    //Loop through for usernames
    //We know that the _users array is an array of users and the main person, so it is at least length 1
    let j = 1
    _users.forEach(user => {
        j++
        sql = sql + ` OR username LIKE '${user}'`
    })


    sql = sql + ') ORDER BY post_time DESC LIMIT ' + _lim;
    const results = await client.query(sql);
    return results;
};

module.exports = { getExclusiveGroupPosts, getFeedQuery, getFeedGroupsOnlyQuery, getFeedUsersOnlyQuery };
