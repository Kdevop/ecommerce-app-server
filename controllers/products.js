const Queries = require('../db/queries');

const querySchema = { name: 'products', category: '', products: '', id: ''};
const productsQueries = new Queries(querySchema);

const getAllProducts = async (req, res) => {
    try {
        const products = await productsQueries.getAllFromSchema();
        if (products.error) {
            res.status(400).json({ success: false, message: products.message });
        }
        else {
            res.status(200).json({ success: true, message: 'Products returned', data: products.data });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const getProductById = async (req, res) => {
    try {

        const id = req.params.id;
        
        const productByIdSchema = {name: 'products', id: id};
        
        const productById = new Queries(productByIdSchema);
        
        const product = await productById.getFromSchemaById(productByIdSchema);

        if(product.error) {
            return res.status(400).json({ success: false, message: product.message });
        } if (product.data.length === 0) {
            return res.status(404).json({ success: false, message: 'No product with that id.' });
        }
        else {
            return res.status(200).json({ success: true, message: 'Product returned', data: product.data });
        }
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
}

const getProductsByCategory = async (req, res) => {
    try {
        const reqCategory = req.params.category;
        
        if (!reqCategory) {
            return res.status(400).json({ success: false, message: 'Category is required.'});
        } 

        const updatedQuerySchema = { ...productsQueries.querySchema, name: 'products', category: reqCategory };
        const result = await productsQueries.getFromSchemaByCategory(updatedQuerySchema);

        if(result.error) {
            return res.status(400).json({ success: false, message: result.message });
        }
        if (result.data.length === 0) {
            res.status(404).json({ success: false, message: 'No products by that category.' });
        } else {
            res.status(200).json({ success: true, message: 'Products returned by category', data: result.data });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const getProductByName = async (req, res) => {
    try{
        const updatedQuerySchema = { ...productsQueries.querySchema, products:req.params.name };
        const result = await productsQueries.getFromSchemaByName(updatedQuerySchema);
        if (result.error) {
            return res.status(400).json({ success: false, message: result.message });
        } 
        if (result.rows.length === 0) {
            res.status(404).json({ success: false, message: 'No products by that name' });
        } else {
            return res.status(200).json({ success: true, message: 'Product returned by name', data: result.data });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}

module.exports = {
    getAllProducts,
    getProductById,
    getProductsByCategory,
    getProductByName,
};