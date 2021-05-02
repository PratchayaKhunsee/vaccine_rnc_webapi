const express = require('express');
const app = express();

// ============= Using 'ejs' for better exprerience ============= // 

app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');

// ============= Middleware Usage ============== //

app.use(express.urlencoded({ extended: true, }));
app.use(express.json({ limit: '3mb', }));

module.exports = app;