const express = require('express');
const app = express();
const port = process.env.PORT || 5000;

app.get('/', (req, res) => {
    res.send('Rythm bazar server is running');
})

app.listen(port, () => {
    console.log("Server is running on port:", port);
})