let express = require('express');
let client = require('./database');
let app = express();

app.get('/', function(req, res) {
    res.write('Successful');
    res.end();
})