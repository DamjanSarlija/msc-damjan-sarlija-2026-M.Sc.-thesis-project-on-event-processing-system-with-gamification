module.exports = (store) => {
    const express = require('express');
    const router = express.Router();

    router.get('/', (req, res) => {
        res.json(store);
    });

    return router;
};