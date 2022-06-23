const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const app = express();
const port = process.env.PORT || 5000;
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const stripe = require('stripe')(process.env.STRIPE_KEY)

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
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: 'Unauthorized Access' });
  }

  const token = authHeader.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).send({ message: 'Forbidden Access' });
    }
    req.decoded = decoded;
    next();
  });
};

const run = async () => {
  try {
    await client.connect();

    const carEquipmentsCollection = client
      .db('car_equipment')
      .collection('equipment');
    const ordersCollection = client.db('car_equipment').collection('order');
    const reviewsCollection = client
      .db('car_equipment')
      .collection('addReview');
    const usersCollection = client.db('car_equipment').collection('user');
    const paymentCollection = client.db('car_equipment').collection('payments');

    const verifyAdmin = async (req, res, next) => {
      const requester = req.decoded.email;
      const requesterAccount = await usersCollection.findOne({
        email: requester,
      });
      if (requesterAccount.role === 'admin') {
        next();
      } else {
        res.status(403).send({ message: 'forbidden' });
      }
    };

    app.get('/user', async (req, res) => {
      const users = await usersCollection.find().toArray();
      res.send(users);
    });

    app.get('/user/:email', verifyToken, async(req, res) => {
      const email = req.params.email;
      const query = {email: email};
      const result = await usersCollection.findOne(query);

      res.send(result);
    })

  // UPDATE PROFILE
  app.patch('/profileUpdate/:email', verifyToken, async (req, res) => {
    const email = req.params.email;
    const user = req.body;
    const filter = { email: email };
    const options = { upsert: true };
    const updateDoc = {
      $set: user
    };

    const result = await usersCollection.updateOne(
      filter,
      updateDoc,
      options
    );
      
    res.send({success: true, result})
  });


    app.get('/admin/:email', async (req, res) => {
      const email = req.params.email;
      const user = await usersCollection.findOne({ email: email });
      const isAdmin = user.role === 'admin';
      res.send({ admin: isAdmin });
    });

    app.put('/user/admin/:email', verifyToken, verifyAdmin, async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const updateDoc = {
        $set: { role: 'admin' },
      };

      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // Auth
    app.put('/user/:email', async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      // console.log(user);
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };

      const result = await usersCollection.updateOne(
        filter,
        updateDoc,
        options
      );
     
      const token = jwt.sign(
        { email: email },
        process.env.ACCESS_TOKEN_SECRET,
        {
          expiresIn: '1d',
        }
      );
      res.send({ result, token: token });
    });



    
    app.post('/create-payment-intent', async(req, res) =>{
      const product = req.body;
      const price = product.price;
      const amount = parseInt(price) * 100;
      const paymentIntent = await stripe.paymentIntents.create({
        amount : amount,
        currency: 'usd',
        payment_method_types:['card']
      });
      res.send({clientSecret: paymentIntent.client_secret})
    });





    // get all
    app.get('/equipment', async (req, res) => {
      const query = {};
      const equipments = (
        await carEquipmentsCollection.find(query).toArray()
      ).reverse();
      res.send(equipments);
    });

    app.post('/equipment', async(req, res) => {
     const equipment = req.body;
     console.log(req?.body);
    //  console.log(res);
     const result = await carEquipmentsCollection.insertOne(equipment);
     res.send(result)
    })

    app.delete('/equipment/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await carEquipmentsCollection.deleteOne(query);
      res.send({ success: 'Cancel Successfully', result });
    });

    //Put 
    app.put('/equipment/:id', async(req, res) => {
      const id = req.params.id;
      const available_quantity = req.body.avQuantity;
      const filter = {_id: ObjectId(id)};
      const options = {upsert: true};
      const doc = {
        $set: {available_quantity}
      }
      const result = await carEquipmentsCollection.updateOne(filter, doc, options);

      res.send({success: true, result})
    })

    // get single
    app.get('/equipment/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await carEquipmentsCollection.findOne(query);
      res.send(result);
    });

    // review
    app.post('/allReviews',verifyToken, async (req, res) => {
      const ratings = req.body;
      const addReviews = await reviewsCollection.insertOne(ratings);

      res.send({ success: true, addReviews });
    });

    // all Reviews
    app.get('/allReviews', verifyToken, async (req, res) => {
      const query = {};
      const reviews =  (await reviewsCollection.find(query).toArray()).reverse()
      res.send({success: true, reviews});
    });

    //order post
    app.put('/order/:id', async (req, res) => {
      const id = req.params.id;
      const orderData = req.body;
      const filter = {_id: ObjectId(id)};
      const orderDoc = {
        $set:orderData
      }
      const result = await ordersCollection.updateOne(filter, orderDoc);

      res.send({success: true, result})
    });

    // order get
    app.get('/order', verifyToken, async (req, res) => {
      const query = {};
      const result = await ordersCollection.find(query).toArray();
     
      res.send(result)
    });
    // order get by email
    app.get('/order/:email', verifyToken, async (req, res) => {
      const decodedEmail = req.decoded.email;
      const email = req.params.email;
      console.log(decodedEmail, 'normal', email);
      if (decodedEmail === email) {
        const query = { email: email };
        const result = await ordersCollection.find(query).toArray();
        return res.send(result);
      } else {
        return res.status(403).send({message: 'Forbidden Access'});
      }
    });


    app.get('/order/:id', async(req, res) => {
      const id = req.params.id;
      const query = {_id: ObjectId(id)};
      const result = await ordersCollection.findOne(query);

      res.send(result)
    })

    app.patch('/order/:id',  async(req, res) =>{
      const id = req.params.id;
      const payment = req.body;
      const filter = {_id: ObjectId(id)};
      const updatedoc = {
        $set:{
          paid: true,
          paymentId: payment.transactionId
        }
      }

      const result = await paymentCollection.insertOne(payment);
      const updatedOrder = await ordersCollection.updateOne(filter, updatedoc);

      res.send(updatedOrder);
    })


    app.delete('/order/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await ordersCollection.deleteOne(query);
      res.send({ success: 'Cancel Successfully', result });
    });



  } finally {
  }
};

run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Hello from Car Manufacturer');
});

app.listen(port, () => {
  console.log('Listening the port', port);
});
