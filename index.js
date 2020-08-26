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

app.get('/', function(req, res){
    res.send('...');
});

app.post('/', function (req, res) {
    let responseData = {
        type: ''
    };
    switch (req.query.action) {
        case 'login': {
            responseData.type = 'login';
            break;
        }
        default: {
            responseData = null;
            break;
        }
    }

    res.set({
        'Content-Type': 'text/json; charset=UTF-8'
    });
    res.send(JSON.stringify(responseData));
});

app.listen(port, function () {});