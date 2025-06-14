const express = require('express');
const cors = require('cors');
require('dotenv').config();

const routes = require('./routes/index')

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/v1/', routes);

app.get('/', (req, res) => res.send('API is running!'));

module.exports = app;