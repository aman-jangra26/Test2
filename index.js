const express = require('express');
const app = express();
const mongoose = require('mongoose');
require('dotenv').config();
mongoose.connect(process.env.DB_URL);

const routes = require('./api/Index');

app.use('/api', routes);

//app.use('/api', apiRoutes); // Mount the api routes under '/api' URL prefix

app.listen( process.env.PORT ,()=>{
    console.log(` server is running on ${process.env.PORT}`);
});
