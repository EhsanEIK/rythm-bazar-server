const express = require('express');
const app = express();
const port = process.env.PORT || 5000;
const cors = require('cors');
require('dotenv').config();

// middleware
app.use(cors());
app.use(express.json());


const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.fbieij7.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        const usersCollection = client.db('rythmBazarDB').collection('users');
        const categoriesCollection = client.db('rythmBazarDB').collection('categories');
        const productsCollection = client.db('rythmBazarDB').collection('products');

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
        app.get('/users/sellers', async (req, res) => {
            const query = { userRole: 'seller' };
            const sellers = await usersCollection.find(query).toArray();
            res.send(sellers);
        })

        // users [POST]
        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await usersCollection.insertOne(user);
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

        // products [POST]
        app.post('/products', async (req, res) => {
            const product = req.body;
            const result = await productsCollection.insertOne(product);
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