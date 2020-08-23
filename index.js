let express = require('express');
let client = require('./database').client;
let app = express();

app.get('/', function(req, res) {
    res.write('Successful');
    res.end();
});

app.listen();