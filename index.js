let express = require('express');
let client = require('./database').client;
let app = express();

app.get('/', function(req, res) {
    res.send('Successful.');
});

app.listen(443, function(){
    console.log('Have a vistor');
});