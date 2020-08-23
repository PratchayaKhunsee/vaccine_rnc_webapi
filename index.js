let express = require('express');
let client = require('./database').client;
let app = express();
let port = process.env.PORT || 8080;

app.get('/', function(req, res) {
    res.send('Successful.');
});

app.listen(port, function(){
    console.log('Have a vistor');
});