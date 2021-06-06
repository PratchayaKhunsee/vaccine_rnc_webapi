const express = require('express');
const app = express();
const path = require('path');

// ============= Middleware Usage ============== //

app.use(express.urlencoded({ extended: true, }));
app.use(express.json({ limit: '10mb', }));

module.exports = app;