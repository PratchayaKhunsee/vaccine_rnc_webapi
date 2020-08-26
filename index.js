const express = require('express');
const app = express();
const session = require('express-session');
const uuid = require('uuid').v4;
const bodyParser = require('body-parser');
const FileStore = require('session-file-store')(session);
const login = require('./response/login');

const {
    LoginError
} = require('./error');
let port = process.env.PORT || 8080;

app.use(session({
    genid() {
        return uuid();
    },
    secret: Math.random().toString().replace(/^0\./g, ''),
    resave: false,
    saveUninitialized: true,
    store: new FileStore()
}));
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());

app.get('/', function (req, res) {
    res.send('...');
});

app.post('/login', function (req, res) {
    (async () => {

        res.set({
            'Content-Type': 'application/json'
        });

        try {
            console.log(req.body)
            let loginSuccess = await (await login(req.body.username, req.body.password));
            

            if (loginSuccess instanceof LoginError) {
                res.send("null");
                return;
            }
            res.send(loginSuccess);
        } catch (error) {
            res.send("null");
        }
    })();
});

app.listen(port, function () {});