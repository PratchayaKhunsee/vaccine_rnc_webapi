const express = require('express');
const app = express();
// const session = require('express-session');
// const uuid = require('uuid').v4;
const bodyParser = require('body-parser');
const login = require('./response/login');
const { LoginError } = require('./error');
let port = process.env.PORT || 8080;

app.use(bodyParser.urlencoded({
    extended: true
}));

// app.use(session({
//     genid() {
//         return uuid();
//     },
//     secret: 'vaccine-database',
//     resave: false,
//     saveUninitialized: true
// }));

app.get('/', function (req, res) {
    res.send('...');
});

app.post('/login', function (req, res) {
    (async () => {
        let loginSuccess = await (await login(req.body.username, req.body.password));
        res.set({
            'Content-Type': 'application/json'
        });
        
        if(loginSuccess instanceof LoginError) {
            res.send("null");
            return;
        }
        res.send(loginSuccess);
    })();
});

app.listen(port, function () {});