const knex = require('../database/db.js');
const {
    getExclusiveGroupPosts,
    getFeedQuery,
    getFeedGroupsOnlyQuery,
    getFeedUsersOnlyQuery,
} = require('../database/queries.js');
const { getGroupFollowingRaw } = require('./utilities/getGroupFollowing.js');
const getGroupModerators = require('./utilities/getGroupModerators.js');
const isGroupPublic = require('./utilities/isGroupPublic.js');
const connector = require('../database/kwildb.js');


// Queries Kwil server based on request, response, and the inputted query function.
async function defGetter(req, res, _queryFunc) {
    try {
        const result = await _queryFunc(req);
        res.send(result);
    } catch(e) {
        res.send('There was an error');
        console.log(e);
    }
    res.end()
};

class Getter {

    // Checks whether user exists in server.
    async ifUserExists(req, res) {
        const queryFunc = async (req) => {
            const accountRes = knex('users_lite')
                .select('modulus')
                .where({username: req.params['0']}).toString();
            let account = await connector.query(accountRes);
            return account[0];
        };
        defGetter(req, res, queryFunc);
    };

    // Logs user in to their account.
    async login(req, res) {
        const queryFunc = async (req) => {
            const loginRes = knex('users')
                .select('login_ciphertext', 'salt')
                .where({ username: req.params['0'] }).toString();
            let login = await connector.query(loginRes);
            return login;
        };
        defGetter(req, res, queryFunc);
    };

    // Returns account data based on login.
    async getAccountData(req, res) {
        const queryFunc = async (req) => {
            const dataRes = knex('users')
                .select('display_name', 'bio', 'pfp_hash', 'banner_hash', 'settings')
                .where({ username: req.params['0'] }).toString();
            let data = await connector.query(dataRes);
            return data[0];
        };
        defGetter(req, res, queryFunc);
    };

    // Returns whether user is following another user.
    async isFollowing(req, res) {
        const queryFunc = async (req) => {
            const dataRes = knex('followers').select('followee').where({
                follower: req.params['0'],
                followee: req.params['1'],
            }).toString();
            let data = await connector.query(dataRes);
            return data[0];
        };
        defGetter(req, res, queryFunc);
    };

    // Returns group data.
    async getGroupData(req, res) {
        const queryFunc = async (req) => {
            const resQuery = knex('groups')
                .select(
                    'group_name',
                    'group_owner',
                    'public',
                    'group_description',
                    'tags',
                    'links',
                    'moderators',
                    'photo_hash',
                    'banner_hash',
                    'color',
                    'rules'
                )
                .where({ group_name: req.params['0'] }).toString();
                let results = await connector.query(resQuery);
            return results[0];
        };
        defGetter(req, res, queryFunc);
    };

    // Returns accounts that individual user is following.
    async getFollowing(req, res) {
        const queryFunc = async (req) => {
            const followersQuery = knex('followers')
                .select('followee')
                .where({follower: req.params['0']}).toString();
            let followers = await connector.query(followersQuery);
            return followers;
        };
        defGetter(req, res, queryFunc);
    };

    // Returns accounts that follow a requested user.
    async getFollowers(req, res) {
        const queryFunc = async (req) => {
            const followersQuery = knex('followers')
                .select('follower')
                .where({followee: req.params['0']}).toString();
            let followers = await connector.query(followersQuery);
            return followers;
        };
        defGetter(req, res, queryFunc);
    };

    // Returns a group's post.
    async getGroupPosts(req, res) {
        const queryFunc = async (req) => {
            const publicity = await isGroupPublic(req.params['0']);
            let _time = Date.now();
            if (req.params['1'] != 'none') {
                _time = new Date(Number(req.params['1']));
            };
            let lim = 20;
            if (req.params['2'] < 20) {
                lim = req.params['2'];
            };
            if (publicity) {
                const resQuery = knex('posts')
                    .select(
                        'post_id',
                        'post_title',
                        'post_text',
                        'post_time',
                        'post_type',
                        'username',
                        'group_name',
                        'photo_hash',
                    )
                    .where({ group_name: req.params['0'] })
                    .andWhere('post_time', '<', _time)
                    .orderBy('post_time', 'desc')
                    .limit(lim).toString();
                let results = await connector.query(resQuery);
                return results;
            } else {
                const groupMembers = await getGroupModerators(req.params['0']);
                let results = [];
                if (groupMembers.length > 0) {
                    results = await getExclusiveGroupPosts(
                        req.params['0'],
                        groupMembers,
                        lim
                    );
                };
                return results;
            };
        };
        defGetter(req, res, queryFunc);
    };

    // Returns whether user is a member of a group.
    async isMember(req, res) {
        const queryFunc = async (req) => {
            const resQuery = knex('group_followers')
                .select('group_name')
                .where({
                    follower: req.params['0'],
                    group_name: req.params['1'],
                }).toString();
            let results = await connector.query(resQuery);
            return results;
        };
        defGetter(req, res, queryFunc);
    };

    // Returns most recent group post and group data.
    async getGroupPreview(req, res) {
        const queryFunc = async (req) => {
            const groupResultsQuery = knex('groups')
                .select(
                    'group_owner',
                    'public',
                    'group_description',
                    'tags',
                    'links',
                    'moderators',
                    'photo_hash',
                    'banner_hash',
                    'color'
                )
                .where({ group_name: req.params['0'] }).toString();
            let groupResults = await connector.query(groupResultsQuery);
            const publicity = await isGroupPublic(req.params['0'])
            let results = ''
            if (publicity) {
                let resultsQuery = knex('posts')
                    .select(
                        'post_id',
                        'post_title',
                        'post_text',
                        'post_time',
                        'post_type',
                        'username',
                        'group_name',
                        'photo_hash'
                    )
                    .where({ group_name: req.params['0'] })
                    .orderBy('post_time', 'desc')
                    .limit(1).toString();
                let results = await connector.query(resultsQuery);
                return({
                    groupData: groupResults[0],
                    recentPost: results[0],
                });
            } else {
                const groupMembers = await getGroupModerators(req.params['0']);
                results = await getExclusiveGroupPosts(
                    req.params['0'],
                    groupMembers,
                    1
                );
                return({
                    groupData: groupResults[0],
                    recentPost: results[0],
                });
            };
        };
        defGetter(req, res, queryFunc);
    };

    // Returns a user's groups.
    async getGroups(req, res) {
        const queryFunc = async (req) => {
            const resultsQuery = knex('group_followers')
                .select('group_name')
                .where({ follower: req.params['0'] }).toString();
            let results = await connector.query(resultsQuery);
            return(results);
        };
        defGetter(req, res, queryFunc);
    };

    // Returns a group's moderators.
    async getModerators(req, res) {
        const queryFunc = async (req) => {
            const members = await getGroupModerators(req.params['0']);
            return(members);
        };
        defGetter(req, res, queryFunc);
    };

    // Returns whether a group exists.
    async ifGroupExists(req, res) {
        const queryFunc = async (req) => {
            const resultsQuery = knex('groups')
                .select('public')
                .where({ group_name: req.params['0'] }).toString();
            let results = await connector.query(resultsQuery);
            return(results);
        };
        defGetter(req, res, queryFunc);
    };

    // Returns whether user is following a group.
    async isFollowingGroup(req, res) {
        const queryFunc = async (req) => {
            const dataQuery = knex('group_followers')
                .select('group_name')
                .where({
                    follower: req.params['0'],
                    group_name: req.params['1'],
                }).toString();
            let data = await connector.query(dataQuery);
            return(data[0]);
        };
        defGetter(req, res, queryFunc);
    };

    // Returns a group's followers.
    async getGroupFollowers(req, res) {
        const queryFunc = async (req) => {
            const dataQuery = knex('group_followers').select('follower').where({group_name: req.params['0']}).toString();
            let data = await connector.query(dataQuery);
            return(data);
        };
        defGetter(req, res, queryFunc);
    };

    // Returns a user's posts.
    async getPosts(req, res) {
        const queryFunc = async (req) => {
            const _time = new Date(Number(req.params['1']));
            let lim = 20;
            if (req.params['2'] < 20) {
                lim = req.params['2']
            };
            const resultsQuery = knex('posts')
                .select(
                    'post_id',
                    'post_title',
                    'post_text',
                    'post_time',
                    'post_type',
                    'username',
                    'group_name',
                    'photo_hash'
                )
                .where({ username: req.params['0'] })
                .andWhere('post_time', '<', _time)
                .orderBy('post_time', 'desc')
                .limit(lim).toString();
            let results = await connector.query(resultsQuery);
            return(results);
        };
        defGetter(req, res, queryFunc);
    };

    // Returns a user's feed.
    async getFeed(req, res) {
        const queryFunc = async (req) => {
            const _time = Number(req.params['1']);
            let lim = 20;
            if (req.params['2'] < 20) {
                lim = req.params['2']
            };
            const followingQuery = knex('followers').select('followee').where({
                follower: req.params['0'],
            }).toString();
            let following = await connector.query(followingQuery);
            const groupFollowing = await getGroupFollowingRaw(req.params['0']);
            const results = await getFeedQuery(
                req.params['0'],
                following,
                groupFollowing,
                lim,
                _time
            );
            return(results);
        };
        defGetter(req, res, queryFunc);
    };

    async getFeedSpecific(req, res) {
        const queryFunc = async (req) => {
            const _time = Number(req.params['1']);
            let lim = 20;
            if (req.params['2'] < 20) {
                lim = req.params['2']
            };
            const followingQuery = knex('followers').select('followee').where({
                follower: req.params['0'],
            }).toString();
            let following = await connector.query(followingQuery);
            const groupFollowing = await getGroupFollowingRaw(req.params['0']);
            const results = await getFeedQuery(
                req.params['0'],
                following,
                groupFollowing,
                lim,
                _time,
                req.params['3']
            );
            return(results);
        };
        defGetter(req, res, queryFunc);
    };

    // Returns user's thoughts.
    async getThoughts(req, res) {
        const queryFunc = async (req) => {
            const _time = new Date(Number(req.params['1']));
            let lim = 20;
            if (req.params['2'] < 20) {
                lim = req.params['2']
            };
            const resultsQuery = knex('posts')
                .select(
                    'post_id',
                    'post_title',
                    'post_text',
                    'post_time',
                    'post_type',
                    'username',
                    'group_name',
                    'photo_hash'
                )
                .where({ username: req.params['0'], post_type: true })
                .andWhere('post_time', '<', _time)
                .orderBy('post_time', 'desc')
                .limit(lim).toString();
            let results = await connector.query(resultsQuery);
            return(results);
        };
        defGetter(req, res, queryFunc);
    };

    // Returns user's thinkpieces.
    async getThinkpieces(req, res) {
        const queryFunc = async (req) => {
            const _time = new Date(Number(req.params['1']));
            let lim = 20;
            if (req.params['2'] < 20) {
                lim = req.params['2']
            };
            const resultsQuery = knex('posts')
                .select(
                    'post_id',
                    'post_title',
                    'post_text',
                    'post_time',
                    'post_type',
                    'username',
                    'group_name',
                    'photo_hash'
                )
                .where({ username: req.params['0'], post_type: false })
                .andWhere('post_time', '<', _time)
                .orderBy('post_time', 'desc')
                .limit(lim).toString();
            let results = await connector.query(resultsQuery);
            return(results);
        };
        defGetter(req, res, queryFunc);
    };

    // Returns post's comments.
    async getComments(req, res) {
        const queryFunc = async (req) => {
            const _time = new Date(Number(req.params['1']));
            let lim = 20;
            if (req.params['2'] < 20) {
                lim = req.params['2']
            };
            const resultsQuery = knex(req.params['3'])
                .select('post_id', 'post_text', 'post_time', 'username')
                .where({ reference_id: req.params['0'] })
                .andWhere('post_time', '<', _time)
                .orderBy('post_time', 'desc')
                .limit(lim).toString();
            let results = await connector.query(resultsQuery);
            return(results);
        };
        defGetter(req, res, queryFunc);
    };

    // Returns post given a post's id.
    async getPostByID(req, res) {

        const queryFunc = async (req) => {
            const resultsQuery = knex('posts')
                .select(
                    'post_id',
                    'post_title',
                    'post_text',
                    'post_time',
                    'post_type',
                    'username',
                    'group_name',
                    'photo_hash'
                )
                .where({ post_id: req.params['0'] }).toString();
            let results = await connector.query(resultsQuery);
            return(results[0]);
        };
        defGetter(req, res, queryFunc);
    };

    // Returns a user's public key.
    async getModulus(req, res) {
        const queryFunc = async (req) => {
            const resultsQuery = knex('users')
                .select('modulus')
                .where({username: req.params['0']}).toString();
            let results = await connector.query(resultsQuery);
            return(results[0]);
        };
        defGetter(req, res, queryFunc);
    };

    // Returns a user's salt.
    async getSalt(req, res) {
        const queryFunc = async (req) => {
            const resultsQuery = knex('users')
                .select('salt')
                .where({username: req.params['0']}).toString();
            let results = await connector.query(resultsQuery);
            return(results[0]);
        };
        defGetter(req, res, queryFunc);
    };

    // Returns a user's settings.
    async getSettings(req, res) {
        const queryFunc = async (req) => {
            const resultsQuery = knex('users')
                .select('settings')
                .where({username: req.params['0']}).toString();
            let results = await connector.query(resultsQuery);
            return(results[0]);
        };
        defGetter(req, res, queryFunc);
    };

    // Returns a user's messaging invitations.
    async getInvites(req, res) {
        const queryFunc = async (req) => {
            const resultsQuery = knex('invites')
                .select('invite', 'invite_key', 'invite_id')
                .where({username: req.params['0']}).toString();
            let results = await connector.query(resultsQuery);
            return(results);
        };
        defGetter(req, res, queryFunc);
    };

    // Returns a user's feed with group posts only.
    async getFeedGroupsOnly(req, res) {
        const queryFunc = async (req) => {
            const groups = await getGroupFollowingRaw(req.params['0']);
            const _time = Number(req.params['1']);
            let results;
            if (groups.length >0) {
                results = await getFeedGroupsOnlyQuery(groups, req.params['2'], _time);
            } else {
                results = [];
            };
            return(results);
        };
        defGetter(req, res, queryFunc);
    };

    // Returns a user's feed with accounts exclusively.
    async getFeedUsersOnly(req, res) {
        const queryFunc = async (req) => {
            const usersQuery = knex('followers')
                .select('followee')
                .where({follower: req.params['0']}).toString();
            let users = await connector.query(usersQuery);
            const userArr = [req.params['0']]
            users.forEach(user => {
                userArr.push(user.followee)
            })
            const _time = Number(req.params['1']);
            let results = await getFeedUsersOnlyQuery(userArr, req.params['2'], _time)
            return(results);
        };
        defGetter(req, res, queryFunc);
    };
    
    // Returns a post's statistics.
    async getPostStats(req, res) {
        const queryFunc = async (req) => {
            const resultsQuery = knex('likes')
                .select('liked')
                .where({username: req.params['0'], post_id: req.params['1']}).toString();
            let results = await connector.query(resultsQuery);
            const likedResultsQuery = knex('likes')
                .where({liked: true, post_id: req.params['1']})
                .count('liked as cnt').toString();
            let likedResults = await connector.query(likedResultsQuery);
            const dislikedResultsQuery = knex('likes')
                .where({liked: false, post_id: req.params['1']})
                .count('liked as cnt').toString();
            let dislikedResults = await connector.query(dislikedResultsQuery);
            const commentCntQry = knex('post_comments')
                .where({reference_id: req.params['1']})
                .count('post_id as cnt').toString();
            let commentCnt = await connector.query(commentCntQry);
            return({likeData: results[0], likes: likedResults[0].cnt, dislikes: dislikedResults[0].cnt, comments: commentCnt[0].cnt});
        };
        defGetter(req, res, queryFunc);
    };

    // Counts the number of likes a post has.
    async countLikes(req, res) {
        const queryFunc = async (req) => {
            const likedResultsQuery = knex('likes')
                .where({liked: true, post_id: req.params['1']})
                .count('liked as cnt').toString();
            let likedResults = await connector.query(likedResultsQuery);
            const dislikedResultsQuery = knex('likes')
                .where({liked: false, post_id: req.params['1']})
                .count('liked as cnt').toString();
            let dislikedResults = await connector.query(dislikedResultsQuery);
            return({likes: likedResults[0].cnt, dislikes: dislikedResults[0].cnt});
        };
        defGetter(req, res, queryFunc);
    };

    // Returns matching accounts for user request.
    async searchUsers(req, res) {
        const queryFunc = async (req) => {
            const resultsQuery = knex('users')
                .select('username')
                .whereRaw(`username ilike '%${req.params['0']}%' or display_name ilike '%${req.params['0']}%'`).toString();
            let results = await connector.query(resultsQuery);
            return(results);
        };
        defGetter(req, res, queryFunc);

    };

    // Returns matching groups for user request.
    async searchGroups(req, res) {
        const queryFunc = async (req) => {
            const resultsQry = knex('groups')
                .select('group_name')
                .whereRaw(`group_name like '%${req.params['0']}%'`).toString();
            let results = await connector.query(resultsQry);
            return(results);
        };
        defGetter(req, res, queryFunc);
    };
};


module.exports = new Getter;
