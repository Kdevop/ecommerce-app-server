const express = require('express');
const { getAllProducts, getProductsByCategory, getProductByName, getProductById } = require('../controllers/products');

const productRouter = express.Router();
productRouter.get('/', getAllProducts);
productRouter.get('/id/:id', getProductById);
productRouter.get('/category/:category', getProductsByCategory);
productRouter.get('/name/:name', getProductByName);

module.exports = { 
    productRouter
};