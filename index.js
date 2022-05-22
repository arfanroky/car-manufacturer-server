const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 5000;
require('dotenv').config();


//Middle Ware
app.use(cors());
app.use(express.json());


app.get('/', (req, res)=>{
    res.send('Hello from Car Manufacturer');
});
app.get('/', (req, res)=>{
    res.send('Hello from Car Manufacturer heroku');
});

app.listen(port, () => {
    console.log('Listening the port', port);
})