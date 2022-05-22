const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const app = express();
const port = process.env.PORT || 5000;
require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');

//Middle Ware
app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.cepeo.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

console.log(uri);

const run = async()=>{
    try{
        await client.connect();
        console.log('working');
    }
    finally{}
}

run().catch(console.dir)




app.get('/', (req, res)=>{
    res.send('Hello from Car Manufacturer');
});
app.get('/', (req, res)=>{
    res.send('Hello from Car Manufacturer heroku');
});

app.listen(port, () => {
    console.log('Listening the port', port);
})