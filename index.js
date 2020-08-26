const express = require('express');
const app = express();
const session = require('express-session');
const login = require('./response/login');
const uuid = require('uuid').v4;
let port = process.env.PORT || 8080;

app.use(session({
    genid() {
        return uuid();
    },
    secret: 'vaccine-database',
    resave: false,
    saveUninitialized: true
}));

app.post('/', function (req, res) {
    switch (req.query('action')) {
        case 'login': {

            break;
        }
        default: {
            res.send('...');
            break;
        }
    }
    // res.send('...');
});

app.listen(port, function () {});