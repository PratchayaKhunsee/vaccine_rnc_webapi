let express = require('express');
let app = express();
let port = process.env.PORT || 8080;

app.get('/', function(req, res) {
    res.send('Welcome to the web.');
});

app.listen(port, function(){
    // console.log('Have a vistor');
});