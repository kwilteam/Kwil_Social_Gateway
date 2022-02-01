const getGroupMembers = require('./utilities/getGroupModerators.js');
const { checkPostSig, checkSignature, checkGroupSignator } = require("./utilities/signatures");
const knex = require('../database/db.js');
require(`dotenv`).config();
const connector = require('../database/kwildb.js');
const { hashStorage } = require('./utilities/hashPath.js');


// This method is a wrapper method to help modularize code for functions in handler.js.
async function reqHandler (req, res, _sigFunc, _dbFunc) {
    try {
        // Since we use body-parser, we can just use req.body in _sigFunc and _dbFunc
        console.log(`Calling ${req.route.path}.  Starting timer...`);
        console.time('request');

        // We check the request's signature using the sig function
        if (await _sigFunc(req.body)) {
            // Calls the database function once signature is verified.
            await _dbFunc(req.body);
            res.send('Success');
        } else {
            res.send('Invalid Signature / Data Entry.  This is likely a client issue.');
        };
    } catch(e) {
        try {
            // Handles API post spamming to crash the server by throwing a pkey error
            res.send('There was an error.  If you are using the API, then it was likely a server side issue');
            console.log(e);
            console.log(`Handler called: ${req.route.path}`);
        } catch(e) {
            console.log(e);
            console.log(`${req.socket.remoteAddress} is spamming the server and has caused an error (likely a pkey collision). Blocking the requestor could prevent more of these errors.`);
        };
    };
    console.timeEnd('request')
    res.end();
}

// Created instead of a constructor because its often globally scoped.
const createHandler = (defHandler) => {

    // The handler class contains methods for handling data and signatures.
    class handler {

        // Request handler function to create a user
        async createAccount (req, res) {

            // Account creation has specialized signature needs and thus needs a unique signature creation function.
            async function creationSig (_d) {

                // Checks whether the username is set to lowercase.
                // If the username isn't lowercase, the sig check fails, thus rejecting the request.
                if (_d.username == _d.username.toLowerCase()) {

                    // Checks the mainSig and creationSig for legitimacy.
                    const mainSig = await checkSignature(JSON.stringify({
                        username: _d.username,
                        modulus: _d.modulus,
                        name: _d.name,
                        bio: _d.bio,
                        pfpHash: _d.pfpHash,
                        bannerHash: _d.bannerHash,
                        timestamp: _d.timestamp,
                        settingsHash: _d.settingsHash,
                    }), _d.signature, _d.modulus);
                    const createSig = await checkSignature(JSON.stringify({
                        username: _d.username,
                        salt: _d.salt,
                        login: _d.login,
                    }), _d.creationSignature, _d.modulus);
                    console.log(`Account created: ${_d.username}.  Signature: ${mainSig}, Creation Signature: ${createSig}`);
                    if (mainSig && createSig) {
                        return true;
                    } else {
                        return false;
                    };
                } else {
                    return false;
                };
            };

            // Inserts requested new user into the node database.
            async function userDB (_d) {
                let query1 = knex('users').insert({
                    username: _d.username,
                    modulus: _d.modulus,
                    display_name: _d.name,
                    bio: _d.bio,
                    pfp_hash: _d.pfpHash,
                    banner_hash: _d.bannerHash,
                    rsa_signature: _d.signature,
                    salt: _d.salt,
                    post_time: _d.timestamp,
                    settings: _d.settingsHash,
                    login_ciphertext: _d.login,
                    creation_signature: _d.creationSignature
                }).toString();

                let query2 = knex('users_lite').insert({
                    username: _d.username,
                    modulus: _d.modulus,
                }).toString();

                const hPath = hashStorage(_d.settingsHash)
                let isError = false
                try {
                    await connector.query(query1, true)
                    await connector.query(query2, true)
                } catch(e) {
                    isError = true
                }
                if (isError == false) {
                    await connector.storeFile('settings/'+hPath, _d.settings)
                }
            };
            // Checks for errors before creating user in database.
            defHandler(req, res, creationSig, userDB);
        };

        // Inserts post into database.
        async post(req, res) {
            async function postDB (p) {
                let query1 = knex('posts').insert({
                    post_id: p.data.id,
                    post_title: p.data.title,
                    post_text: p.data.text,
                    post_time: p.data.timestamp,
                    post_type: p.data.type,
                    username: p.data.username,
                    group_name: p.data.group,
                    photo_hash: p.data.photoHash,
                    rsa_signature: p.signature,
                }).toString();
                await connector.query(query1, true)
                if (p.photo.length > 0) {
                    connector.storePhoto(hashStorage('images/'+p.data.photoHash[0]), p.photo[0])
                };
            };
            // Checks for errors before creating post in database.
            defHandler(req, res, checkPostSig, postDB);
        };

        // Inserts comment into database.
        async comment(req, res) {
            async function commentDB (p) {
                // Checks whether comment type is for post or comment and throws error if neither
                let tableName;
                if ( p.referenceType == 'post' || p.referenceType == 'comment' ) {
                    tableName = p.referenceType + '_comments';
                } else {
                    throw new Error('Invalid referenceType');
                };
                // Writes sql for database request.
                let query1 = knex(tableName).insert({
                    post_id: p.data.id,
                    post_text: p.data.text,
                    post_time: p.data.timestamp,
                    username: p.data.username,
                    reference_id: p.data.referenceID,
                    rsa_signature: p.signature,
                }).toString();
                await connector.query(query1, true);
            };
            // Checks for errors before creating comment in database.
            defHandler(req, res, checkPostSig, commentDB);
        };

        // Inserts group into database.
        async createGroup(req, res) {
            async function groupDB (g) {
                // Allows less toLowerCase() and toUpperCase() function calls in groupDB.
                g.data.username = g.data.username.toLowerCase();
                g.data.groupName = g.data.groupName.toUpperCase();

                // Writes SQL for request
                let query1 = knex('groups').insert({
                    group_name: g.data.groupName,
                    group_owner: g.data.username,
                    public: g.data.public,
                    group_description: g.data.description,
                    tags: g.data.tags,
                    links: g.data.links,
                    moderators: g.data.moderators,
                    photo_hash: g.data.photoHash,
                    banner_hash: g.data.bannerHash,
                    post_time: g.data.timestamp,
                    color: g.data.color,
                    rsa_signature: g.signature,
                    signator: g.data.username,
                }).toString();
                let pkeyErr = false
                try {
                    await connector.query(query1, true);
                } catch(e) {
                    console.log('PKEY ERR')
                    pkeyErr = true
                }
                if (pkeyErr == false) {

                if (g.photo.length > 0) {
                    connector.storePhoto('images/'+hashStorage(g.data.photoHash), g.photo[0])
                };
                if (g.banner.length > 0) {
                    connector.storePhoto('images/'+hashStorage(g.data.bannerHash), g.banner[0]);
                };
            }
            };
            // Checks for errors before creating group in database.
            defHandler(req, res, checkPostSig, groupDB);
        };

        // Edits group paramaters in database.
        async editGroup(req, res) {
            async function editGroupDB (g) {
                // Creates SQL to change group
                if (!g.changed.hasOwnProperty('rsa_signature')) {
                    g.changed.rsa_signature = g.signator.signature
                };
                let query1 = knex('groups')
                    .where({ group_name: g.data.group_name })
                    .update(g.changed).toString();
                await connector.query(query1, true);
                if (g.changed.photo_hash && g.photo) {
                    connector.storePhoto('images/'+hashStorage(g.data.photoHash), g.photo[0])
                };
                if (g.changed.banner_hash && g.banner) {
                    connector.storePhoto('images/'+hashStorage(g.data.bannerHash), g.banner[0]);
                };
            };
            // Checks for errors before initiating group changes in database.
            defHandler(req, res, checkGroupSignator, editGroupDB);
        };

        // Edits account data in database.
        async changeAccountData(req, res) {
            async function changeAccountDataDB (a) {
                // Changes object tracking for incoming data writes.
                let updateObj = {};
                for (let i = 0; i < a.changed.length; i++) {
                    if (a.changed[i] == 'pfp_hash') {
                        updateObj['pfp_hash'] = a.data.pfpHash;
                    };
                    if (a.changed[i] == 'banner_hash') {
                        updateObj['banner_hash'] = a.data.bannerHash;
                    };
                    if (a.changed[i] == 'display_name') {
                        updateObj['display_name'] = a.data.name;
                    };
                    if (a.changed[i] == 'bio') {
                        updateObj['bio'] = a.data.bio;
                    };
                    if (a.changed[i] == 'settings') {
                        updateObj['settings'] = a.data.settingsHash;
                    };
                };
                // Creates edited account SQL statement if edits were requested
                if (Object.keys(updateObj).length > 0) {
                    let query1 = knex('users')
                        .where({
                            username: a.data.username.toLowerCase(),
                        })
                        .update(updateObj).toString();
                    await connector.query(query1, true);
                    if (a.photo && a.changed.includes('pfp_hash')) {
                        await connector.storePhoto('images/'+hashStorage(a.data.pfpHash), a.photo[0])
                    };
                    if (a.banner && a.changed.includes('banner_hash')) {
                        await connector.storePhoto('images/'+hashStorage(a.data.bannerHash), a.banner[0])

                    };
                    if (a.settings && a.changed.includes('settings')) {
                        await connector.storeFile('settings/'+hashStorage(a.data.settingsHash), a.settings)

                    };
                };

            };
            // Checks for errors before initiating account changes in database.
            defHandler(req, res, checkPostSig, changeAccountDataDB);
        };

        // Causes a requested account to follow another in the database.
        async follow(req, res) {
            async function followDB(f) {
                // Checks whether there is an existing entry for this requested follower relationship.
                f.data.username = f.data.username.toLowerCase();
                f.data.followee = f.data.followee.toLowerCase();
                const resQuery1 = knex('followers')
                    .select('followee')
                    .where({ follower: f.data.username, followee: f.data.followee }).toString();
                let relation = await connector.query(resQuery1);
                let relationExists = false;
                if (relation.length > 0) {
                    relationExists = true;
                };
                if ( f.data.follow == true && relationExists == false ) {
                    /*
                        In the post request, a lowercase username should be present as the only parameter.
                    */
                    let query1 = knex('followers').insert({
                        follower: f.data.username,
                        followee: f.data.followee,
                        post_time: new Date(f.data.timestamp),
                    }).toString();
                    await connector.query(query1, true);
                } else if ( f.data.follow == false && relationExists == true ) {
                    let query2 = knex('followers')
                        .where({
                            follower: f.data.username,
                            followee: f.data.followee,
                        })
                        .del().toString();
                    await connector.query(query2, true);
                } else if (relationExists) {
                    throw new Error(`${f.data.username} already follows ${f.data.followee}`);
                } else if (!relationExists) {
                    throw new Error(`${f.data.username} doesn't follow ${f.data.followee}`);
                };
            };
            // Checks for errors before changing follower/followee parameters in database
            defHandler(req, res, checkPostSig, followDB);
        };

        // Adds an account to a group in the database.
        async addMember(req, res) {
            async function addMemberDB(m) {
                // Sets the new member name to lowercase and retrieves the group's memberList.
                m.data.newMember = m.data.newMember.toLowerCase();
                const memberList = await getGroupMembers(m.data.group_name);

                // Triggers if the user is being added to a requested group.
                if ( m.data.added == true ) {

                    // Check if whether the user is not currently a group moderator.
                    if (!memberList.includes(m.data.newMember)) {
                        // Pushes the new member to the group's memberList.
                        memberList.push(m.data.newMember);

                        // Updates the Kwil database.
                        let query1 = knex('groups')
                            .where({
                                group_name: m.data.group_name,
                            })
                            .update({ moderators: memberList }).toString();
                        await connector.query(query1, true);
                    } else {
                        throw new Error(`${m.data.newMember} is already a moderator in group ${m.data.group_name}`);
                    };
                } else if ( m.data.added == false ) { // Triggers if a user is being removed from a group.
                
                    // Checks whether a user is a group moderator already.
                    if (memberList.includes(m.data.newMember)) {
                        // Finds the user's group index and splices the memberList array to remove them.
                        const removeIndex = memberList.findIndex(
                            (member) => member == m.data.newMember
                        );
                        memberList.splice(removeIndex, 1);
                        // Updates Kwil database.
                        let query2 = knex('groups')
                            .where({
                                group_name: m.data.group_name,
                            })
                            .update({ moderators: memberList }).toString();
                        await connector.query(query2, true);
                    } else {
                        throw new Error(`${m.data.newMember} is already not a moderator in group ${m.data.group_name}`);
                    };
                };

            };
            // Checks for errors before changing group moderator/user relationship in database.
            defHandler(req, res, checkGroupSignator, addMemberDB);
        };

        // Creates user/group following relationship.
        async followGroup(req, res) {
            async function followGroupDB(f) {
                f.data.group = f.data.group.toUpperCase()
                f.data.username = f.data.username.toLowerCase()
                if (f.data.follow == true) {
                    const results = await knex('group_followers')
                        .select('group_name')
                        .where({
                            group_name: f.data.group,
                            follower: f.data.username,
                        }).toString();
                    let resQuery1 = await connector.query(results);
                    if (resQuery1.length == 0) {
                        // Checks to see whether anything is recorded when requesting user is queried in group followers.
                        let query1 = knex('group_followers').insert({
                            follower: f.data.username,
                            group_name: f.data.group,
                            post_time: new Date(f.data.timestamp),
                        }).toString();
                        await connector.query(query1, true);
                    } else {
                        throw new Error(`User ${f.data.username} already follows group ${f.data.group}`);
                    };
                } else if (f.data.follow == false) {
                    let query2 = knex('group_followers')
                        .where({
                            follower: f.data.username,
                            group_name: f.data.group,
                        })
                        .del().toString();
                    await connector.query(query2, true);
                };

            };
            // Checks for errors before changing user/group follower relationship in Kwil database.
            defHandler(req, res, checkPostSig, followGroupDB);
        };

        // Creates post/account relationship for like.
        async like(req, res) {
            async function queryFunc(l) {
                // Checks whether user has liked a post and inserted/updates like status accordingly.
                l.data.username = l.data.username.toLowerCase()
                const _date = new Date(l.data.timestamp)
                const prevLikeRes = knex('likes').select('post_time').where({
                    username: l.data.username,
                    post_id: l.data.postID,
                }).toString();
                let prevLike = await connector.query(prevLikeRes);

                // Updates like status.
                if (prevLike.length > 0) {

                    // Since data can be loaded at any time, this ensures the current
                    // like is the most recent one that this bundler is aware of.
                    if (_date > prevLike[0].post_time) {
                        // Updates like parameters.
                        let query1 = knex('likes')
                            .update({
                                liked: l.data.liked,
                                post_time: _date,
                            })
                            .where({
                                username: l.data.username,
                                post_id: l.data.postID,
                            }).toString();
                        await connector.query(query1, true);
                    };
                } else { // Inserts like whose user/post relationship needs initiation.
                    let query2 = knex('likes').insert({
                        username: l.data.username,
                        post_id: l.data.postID,
                        liked: l.data.liked,
                        post_time: _date,
                    }).toString();
                    await connector.query(query2, true);
                };
            };

            // Checks for errors before changing like data in Kwil database.
            defHandler(req, res, checkPostSig, queryFunc);
        };

        // Unlikes a post in the Kwil database.
        async unlike(req, res) {
            async function queryFunc(l) {
                // Sets required variables.
                l.data.username = l.data.username.toLowerCase();
                const prevLikeRes = knex('likes').select('post_time').where({
                    username: l.data.username,
                    post_id: l.data.postID,
                }).toString();
                let prevLike = await connector.query(prevLikeRes);
                let _date = new Date(l.data.timestamp);

                // Checks whether something necessitates deletion.
                if (prevLike.length > 0) {
                    if (_date > prevLike[0].post_time) {
                        let query1 = knex('likes')
                            .where({
                                username: l.data.username,
                                post_id: l.data.postID,
                            })
                            .del().toString();
                        await connector.query(query1, true);
                    };
                };
            };
            // Checks for errors before changing like data in Kwil database.
            defHandler(req, res, checkPostSig, queryFunc);
        };

        // Records messaging invite to database.
        async sendInvite(req, res) {
            async function noSig(i) {
                return true;
            };
            async function queryFunc(i) {
                let query1 = knex('invites').insert({
                    invite_id: i.inviteID,
                    username: i.receiver,
                    invite: i.invite,
                    invite_key: i.inviteKey,
                    post_time: i.timestamp
                }).toString();
                await connector.query(query1, true);
            }
            defHandler(req, res, noSig, queryFunc)
        }

        // Records messaging invite deletion to database.
        async deleteInvite(req, res) {
            async function queryFunc(i) {
                let query1 = knex('invites')
                    .where({invite_id: i.data.inviteID})
                    .del().toString();
                await connector.query(query1, true);
            }
            defHandler(req, res, checkPostSig, queryFunc)
        }
    };

    // Returns handler constructor.
    const retVal = new handler();
    return retVal;
};


module.exports = { createHandler, reqHandler };
