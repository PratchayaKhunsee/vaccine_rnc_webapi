const express = require('express');
const app = express();
const path = require('path');

// ============= Using 'ejs' for better exprerience ============= // 

app.set('view engine', 'ejs');

// ============= Middleware Usage ============== //

app.use(express.urlencoded({ extended: true, }));
app.use(express.json({ limit: '3mb', }));
app.use(express.static(path.dirname(require.main.filename) + '/public'));


module.exports = app;