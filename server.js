const bodyParser = require('body-parser');
require(`dotenv`).config();
const numCPUs = require('os').cpus().length;
const cluster = require('cluster');
const Express = require('express');
const handlerFile = require('./src/handler');
const handler = handlerFile.createHandler(handlerFile.reqHandler);
const getter = require('./src/getter');
const cors = require('cors');
const app = Express();
const ngrok = require('ngrok')
const colors = require('colors')
const pgStartup = require('./database/startup.js')


const start = async () => {
    if (cluster.isMaster) {
        await pgStartup()

        // Starts up the database and logs startup to console
        console.log(`Master ${process.pid} is running`);

        // Creates Node.js worker instances on all cores
        for (let i = 0; i < numCPUs; i++) {
            cluster.fork();
        }
        app.use(bodyParser.json({ limit: '10mb' }));
        app.use(cors());

        // It is important that post requests don't have any params.
        // Params will not be stored with the transaction on Arweave.
        // Post requests initiate inputted handler functions if specified url received post request.
        app.post('/createAccount', handler.createAccount);
        app.post(`/post`, handler.post);
        app.post(`/comment`, handler.comment);
        app.post(`/createGroup`, handler.createGroup);
        app.post('/changeAccountData', handler.changeAccountData);
        app.post('/follow', handler.follow);
        app.post('/editGroup', handler.editGroup);
        app.post('/followGroup', handler.followGroup);
        app.post('/like', handler.like);
        app.post('/unlike', handler.unlike);
        app.post('/sendInvite', handler.sendInvite);
        app.post('/deleteInvite', handler.deleteInvite);

        // Get requests initiate inputted getter functions if specified url receives get request.
        app.get('/', (req, res) => {
            res.send('Hello').end();
        });
        app.get('/*/login', getter.login);
        app.get('/*/accountData', getter.getAccountData);
        app.get('/*/*/isFollowing', getter.isFollowing);
        app.get('/*/ifUserExists', getter.ifUserExists);
        app.get('/*/accountData', getter.getAccountData);
        app.get('/*/groupData', getter.getGroupData);
        app.get('/*/*/*/getGroupPosts', getter.getGroupPosts);
        app.get('/*/*/*/posts', getter.getPosts);
        app.get('/*/*/isMember', getter.isMember);
        app.get('/*/groupPreview', getter.getGroupPreview);
        app.get('/*/getGroups', getter.getGroups);
        app.get('/*/getModerators', getter.getModerators);
        app.get('/*/ifGroupExists', getter.ifGroupExists);
        app.get('/*/*/isFollowingGroup', getter.isFollowingGroup);
        app.get('/*/*/*/getFeed', getter.getFeed);
        app.get('/*/*/*/getThoughts', getter.getThoughts);
        app.get('/*/*/*/getThinkpieces', getter.getThinkpieces);
        app.get('/*/*/*/*/getComments', getter.getComments);
        app.get('/*/getPostByID', getter.getPostByID);
        app.get('/*/followers', getter.getFollowers);
        app.get(`/*/following`, getter.getFollowing);
        app.get(`/*/modulus`, getter.getModulus);
        app.get(`/*/salt`, getter.getSalt);
        app.get(`/*/settings`, getter.getSettings);
        app.get('/*/getInvites', getter.getInvites);
        app.get('/*/*/getPostStats', getter.getPostStats);
        app.get('/*/countLikes', getter.countLikes);
        app.get(`/*/*/*/getFeedGroupsOnly`, getter.getFeedGroupsOnly);
        app.get(`/*/*/*/getFeedUsersOnly`, getter.getFeedUsersOnly);
        app.get('/*/getGroupFollowers', getter.getGroupFollowers);
        app.get(`/*/searchUsers`, getter.searchUsers);
        app.get(`/*/searchGroups`, getter.searchGroups);
        app.use(Express.static('public', { fallthrough: false }));
        await ngrok.authtoken(process.env.NGROK_AUTH)
        /*const url = await ngrok.connect({
            addr: 8080,
            subdomain: process.env.NGROK_SUB,
            region: 'us',
            authtoken: process.env.NGROK_AUTH
        })*/

        app.listen(8080, () => {
            console.log(numCPUs + ' worker threads running');
            console.log(`Server is listening on port 8080`.bold.brightGreen);
        });
    }
};


start();