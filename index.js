const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const app = express();
const port = process.env.PORT || 5000;
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

//Middle Ware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.cepeo.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});


// Verify Token
const verifyToken = (req, res, next)=> {
  const authHeader = req.headers.authorization;
  if(!authHeader){
    return res.status(401).send({message: 'Unauthorized Access'})
  }

  const token = authHeader.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if(err){
      return res.status(403).send({message: 'Forbidden Access'})
    }
    req.decoded = decoded;
    next();
    
  })


}

const run = async () => {
  try {
    await client.connect();

    const carEquipmentsCollection = client.db('car_equipment').collection('equipment');
    const orderCollection = client.db('car_equipment').collection('order');
    const reviewCollection = client.db('car_equipment').collection('addReview');





      //Auth
      app.post('/login', (req, res) => {
        const email = req.body;
        const accessToken = jwt.sign(email, process.env.ACCESS_TOKEN_SECRET, {
            expiresIn:'1d'
        });
        res.send({accessToken});
    })


  // get all 
    app.get('/equipment', async (req, res) => {
      const query = {};
      const equipments = await (await carEquipmentsCollection.find(query).toArray()).reverse(-6);
      res.send(equipments);
    });

    // get single
    app.get('/equipment/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await carEquipmentsCollection.findOne(query);
      res.send(result);
    });

    // review
    app.post('/allReviews', async(req, res) => {
      const ratings = req.body;
      console.log(ratings);
      const addReviews = await reviewCollection.insertOne(ratings);

      res.send({success: true, addReviews})

    })

    app.get('/allReviews', async(req, res) => {
      const query = {};
      const reviews = await (await reviewCollection.find(query).toArray()).reverse(-3);

      res.send(reviews)
    })


  
    //order post
    app.post('/order', async (req, res) => {
      const orderData = req.body;
      const result = await orderCollection.insertOne(orderData);

      res.send({success:true, result});
    })

    // order get
    app.get('/order', verifyToken, async (req, res) => {
      const decodedEmail = req.decoded.email;
      const email = req.query.email;
      if(decodedEmail === email){
        const query = {email: email};
        const result = await orderCollection.find(query).toArray();
        res.send(result)

      }
      else{
        res.status(403).send({message: 'forbidden access'})
    }
      
    })

    app.delete('/order/:id', async (req, res) => {
      const id = req.params.id;
      const query = {_id: ObjectId(id)};
      const result = await orderCollection.deleteOne(query);
      res.send({success:'Cancel Successfully', result})
    })


  } finally {
  }
};

run().catch(console.dir);

// app.get('/', (req, res) => {
//   res.send('Hello from Car Manufacturer');
// });

app.get('/', (req, res) => {
  res.send('Hello from Car Manufacturer and try to solve heroku problem');
});

app.listen(port, () => {
  console.log('Listening the port', port);
});
