const express = require('express');
const app = express();
const port = process.env.PORT || 5000;
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const stripe = require("stripe")(process.env.STRIPE_KEY);

// middleware
app.use(cors());
app.use(express.json());

// verifyJWT
function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: "unauthorized access" });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(401).send({ message: "unauthorized access" });
        }
        req.decoded = decoded;
        next();
    })
}

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.fbieij7.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        const usersCollection = client.db('rythmBazarDB').collection('users');
        const categoriesCollection = client.db('rythmBazarDB').collection('categories');
        const productsCollection = client.db('rythmBazarDB').collection('products');
        const ordersCollection = client.db('rythmBazarDB').collection('orders');
        const paymentsCollection = client.db('rythmBazarDB').collection('payments');
        const reportedItemsCollection = client.db('rythmBazarDB').collection('reportedItems');

        /* =======================
                    JWT
        ========================= */
        // set jwt and send it to the client side
        app.post('/jwt', (req, res) => {
            const userInfo = req.body;
            const token = jwt.sign(userInfo, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "2d" });
            res.send({ token });
        })

        /* ===============================================
               middleware: verify admin, seller, buyer
               and check admin, seller,buyer GET api
       ================================================== */
        // middleware: verify admin
        async function verifyAdmin(req, res, next) {
            const decodedEmail = req.decoded.email;
            const query = { email: decodedEmail };
            const user = await usersCollection.findOne(query);
            if (user?.userRole !== 'admin') {
                return res.status(401).send({ message: "unauthorized access" });
            }
            next();
        }

        // middleware: verify seller
        async function verifySeller(req, res, next) {
            const decodedEmail = req.decoded.email;
            const query = { email: decodedEmail };
            const user = await usersCollection.findOne(query);
            if (user?.userRole !== 'seller') {
                return res.status(401).send({ message: "unauthorized access" });
            }
            next();
        }

        // middleware: verify buyer
        async function verifyBuyer(req, res, next) {
            const decodedEmail = req.decoded.email;
            const query = { email: decodedEmail };
            const user = await usersCollection.findOne(query);
            if (user?.userRole !== 'buyer') {
                return res.status(401).send({ message: "unauthorized access" });
            }
            next();
        }

        // check admin from client side data
        app.get('/users/checkAdmin/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email };
            const user = await usersCollection.findOne(query);
            res.send({ isAdmin: user?.userRole === 'admin' });
        })

        // check seller from client side data
        app.get('/users/checkSeller/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email };
            const user = await usersCollection.findOne(query);
            res.send({ isSeller: user?.userRole === 'seller' });
        })

        // check buyer from client side data
        app.get('/users/checkBuyer/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email };
            const user = await usersCollection.findOne(query);
            res.send({ isBuyer: user?.userRole === 'buyer' });
        })

        /* ========================
                users all api
        =========================== */
        // users [GET-single data using email query]
        app.get('/users', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            res.send(user);
        })

        // users [GET-only sellers]
        app.get('/users/sellers', verifyJWT, verifyAdmin, async (req, res) => {
            const query = { userRole: 'seller' };
            const sellers = await usersCollection.find(query).toArray();
            res.send(sellers);
        })

        // users [GET-only buyers]
        app.get('/users/buyers', verifyJWT, verifyAdmin, async (req, res) => {
            const query = { userRole: 'buyer' };
            const buyers = await usersCollection.find(query).toArray();
            res.send(buyers);
        })

        // users [POST]
        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await usersCollection.insertOne(user);
            res.send(result);
        })

        // users [PUT]
        app.put('/users/sellers/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updatedSellerVerification = {
                $set: {
                    verified: true,
                }
            }
            const result = await usersCollection.updateOne(filter, updatedSellerVerification, options);
            res.send(result);
        })

        // users [DELETE-only seller]
        app.delete('/users/sellers/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await usersCollection.deleteOne(query);
            res.send(result);
        })

        // users [DELETE-only buyer]
        app.delete('/users/buyers/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await usersCollection.deleteOne(query);
            res.send(result);
        })

        /* ============================
                categories all api
        =============================== */
        // categories [GET]
        app.get('/categories', async (req, res) => {
            const query = {};
            const categories = await categoriesCollection.find(query).toArray();
            res.send(categories);
        })

        // categories [GET-single data]
        // app.get('/categories/:id', async (req, res) => {
        //     const id = req.params.id;
        //     const query = { _id: Object(id) };
        //     const category = await categoriesCollection.findOne(query);
        //     res.send(category);
        // })

        /* ============================
                products all api
        =============================== */
        // products [GET-based on category]
        app.get('/products/:id', async (req, res) => {
            const categoryId = req.params.id;
            const query = { category: categoryId };
            const products = await productsCollection.find(query).toArray();
            res.send(products);
        })

        // products [GET-based on seller email, otherwise will get all the products]
        app.get('/products', async (req, res) => {
            let query = {};
            const email = req.query.email;
            if (email) {
                query = { email: email };
            }
            else {
                query = {};
            }
            const products = await productsCollection.find(query).toArray();
            res.send(products);
        })

        // products [POST]
        app.post('/products', verifyJWT, verifySeller, async (req, res) => {
            const product = req.body;
            const result = await productsCollection.insertOne(product);
            res.send(result);
        })

        // products [PUT- update the product available status: true]
        app.put('/products/:id', verifyJWT, verifySeller, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updateProdcutsAdvertise = {
                $set: {
                    advertised: true,
                }
            };
            const result = await productsCollection.updateOne(filter, updateProdcutsAdvertise, options);
            res.send(result);
        })

        // products [DELETE- only product]
        app.delete('/products/:id', verifyJWT, verifySeller, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await productsCollection.deleteOne(query);
            res.send(result);
        })

        /* ============================
                orders all api
        =============================== */
        // orders [GET-based on order id]
        app.get('/orders/payment/:id', verifyJWT, verifyBuyer, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const order = await ordersCollection.findOne(query);
            res.send(order);
        })

        // orders [GET-based on email of buyer]
        app.get('/orders/:email', verifyJWT, verifyBuyer, async (req, res) => {
            const email = req.params.email;
            const query = { buyerEmail: email };
            const orders = await ordersCollection.find(query).toArray();
            res.send(orders);
        })

        // orders [POST]
        app.post('/orders', async (req, res) => {
            const order = req.body;
            const result = await ordersCollection.insertOne(order);
            res.send(result);
        })

        /* ============================
                payments api
        =============================== */
        // create payment intent
        app.post('/create-payment-intent', verifyJWT, verifyBuyer, async (req, res) => {
            const order = req.body;
            const price = order.price;
            const amount = price * 100;
            const paymentIntent = await stripe.paymentIntents.create({
                currency: "usd",
                amount: amount,
                "payment_method_types": [
                    "card"
                ],
            });
            res.send({
                clientSecret: paymentIntent.client_secret,
            })
        })

        // payments [POST]
        app.post('/payments', verifyJWT, verifyBuyer, async (req, res) => {
            const payment = req.body;
            const result = await paymentsCollection.insertOne(payment);

            // update order payment status
            const id = payment.orderId;
            const filter = { _id: ObjectId(id) };
            const updateOrderPayment = {
                $set: {
                    paid: true,
                    transactionId: payment.transactionId,
                }
            };
            const updateOrderPaymentResult = await ordersCollection.updateOne(filter, updateOrderPayment);

            // update product sales status  and advertised
            const productId = payment.productId;
            const filterProductId = { _id: ObjectId(productId) };
            const updateProdcutStatus = {
                $set: {
                    salesStatus: 'sold',
                    advertised: false,
                }
            };
            const updateProductStatusResult = await productsCollection.updateOne(filterProductId, updateProdcutStatus);
            res.send(result);
        })

        /* ============================
                reported items api
        =============================== */
        // reported items [GET]
        app.get('/reportedItems', verifyJWT, verifyAdmin, async (req, res) => {
            const query = {};
            const reportedItems = await reportedItemsCollection.find(reportedItems).toArray();
            res.send(reportedItems);
        })

        // reported items [POST]
        app.post('/reportedItems', verifyJWT, verifyBuyer, async (req, res) => {
            const reportedItems = req.body;
            const result = await reportedItemsCollection.insertOne(reportedItems);
            res.send(result);
        })

    }
    finally { }
}

run().catch(error => console.error(error));

app.get('/', (req, res) => {
    res.send('Rythm bazar server is running');
})

app.listen(port, () => {
    console.log("Server is running on port:", port);
})