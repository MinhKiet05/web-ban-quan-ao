const express = require('express');
const app = express();
require('dotenv').config();
const corsOptions = require('./src/config/cors');
const cors = require('cors');

app.use(cors(corsOptions));
app.use(express.json());


app.listen(3000, () => {
    console.log('Server is running on port 3000');
});
