const express = require('express');
const app = express();
const session = require('express-session');
const uuid = require('uuid').v4;
const bodyParser = require('body-parser');
let port = process.env.PORT || 8080;

app.use(bodyParser({
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

app.post('/', function (req, res) {
    let responseData = {
        body: req.body
    };

    res.set({
        'Content-Type': 'text/json; charset=UTF-8'
    });
    res.send(JSON.stringify(responseData));
});

app.listen(port, function () {});