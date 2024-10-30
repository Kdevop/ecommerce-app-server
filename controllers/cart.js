const Queries = require('../db/queries');
const { dispatchToStripe, paymentObject } = require('../stripe/stripe');

const querySchema = { name: 'carts', customerId: '', products: '', quantity: '', price: '', name: '', url: '', cartId: '', shippingAddress: '', billingAddress: '' };
const cartQueries = new Queries(querySchema);


const openCart = async (req, res) => {
    try {
        const newCart = { ...cartQueries.querySchema, customerId: req.session.passport.user };
        const result = await cartQueries.initCart(newCart);

        if (result.error) {
            return res.status(400).json({ success: false, message: result.message })
        }

        return res.status(200).json({ success: true, message: result.message })
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Unable to create cart. Failed at query' });
    }
};

const getFromCart = async (req, res) => {
    try {
        const customerId = req.session.passport.user;

        const cartProducts = { ...cartQueries.querySchema, customerId };

        const result = await cartQueries.cartDetails(cartProducts);

        if (result.error) {
            return res.status(400).json({ success: false, message: result.message });
        } else {
            return res.status(200).json({ success: true, hasProd: result.hasProd, message: result.message, data: result.data });
        }
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Unable to return cart. Failed at query.' });
    }
};

const addToCart = async (req, res) => {
    try {
        const addProducts = { ...cartQueries.querySchema, customerId: req.session.passport.user, product: req.body.product, quantity: req.body.quantity, price: req.body.price, name: req.body.name, url: req.body.url };

        const result = await cartQueries.addProductToCart(addProducts);

        if (result.error) {
            return res.status(400).json({ success: false, message: result.message });
        } else {
            return res.status(200).json({ success: true, message: result.message, data: result.data });
        }
    } catch (error) {
        console.error('Error adding to cart: ', error);
        return res.status(500).json({ success: false, message: 'Unable to add to cart. Failed at query' });
    }
};

const updateCart = async (req, res) => {
    try {
        const { productId, quantity } = req.body;

        if (!productId || !quantity) {
            return res.status(404).json({ success: false, message: 'Product ID and quantity are both required' });
        }

        const amendProducts = { ...cartQueries.querySchema, customerId: req.session.passport.user, products: req.body.productId, quantity: req.body.quantity };
        const result = await cartQueries.amendCart(amendProducts);

        if (result.error) {
            return res.status(400).json({ success: false, message: result.message });
        } else {
            return res.status(200).json({ success: true, message: result.message, data: result.data }); //this needs updating, we dont get a message back. Also, seem to be an issue with the data. 
        }
    } catch (error) {
        console.error('Error updating cart: ', error);
        return res.status(500).json({ success: false, message: 'Unable to add to cart.' });
    }
}


const deleteItem = async (req, res) => {

    try {

        const deleteProducts = { ...cartQueries.querySchema, customerId: req.session.passport.user, product: Number(req.params.productId) };
        const result = await cartQueries.removeFromCart(deleteProducts);

        if (result.error) {
            return res.status(400).json({ success: false, message: result.message })
        } else {
            return res.status(200).json({ success: true, data: result.data })
        }

    } catch (error) {
        console.error('Error updating cart:', error);
        return res.status(500).json({ success: false, message: 'Unable to delete from cart. Failed at query.' })
    }
}

const checkout = async (req, res) => {
    const { shippingAddress, billingAddress, cartId } = req.body;
    const userId = req.session.passport.user;
    console.log(userId);

    try {
        const sendToCheckout = { ...cartQueries.querySchema, userId: userId, cartId: cartId, shippingAddress: shippingAddress, billingAddress: billingAddress };
        const result = await cartQueries.checkoutData(sendToCheckout);

        if (result.error) {
            return res.status(400).json({ success: false, message: result.message });
        } else {
            //return res.status(200).json({ success: true, message: result.message, data: result.data });
            //next step to get the data for stripe together.

            try {
                const stripe = { ...cartQueries.querySchema, cartId: cartId, userId: userId }
                const stripeData = await cartQueries.dataForStripe(stripe);

                if (stripeData.error) {
                    return res.status(400).json({ success: false, message: result.message });
                } else {
                    //return res.status(200).json({ success: true, message: 'Data ready for stipe.', checkout: result.data, userProducts: stripeData.userProducts, products: stripeData.products });
                    let products = stripeData.products;
                    let userProducts = stripeData.userProducts;
                    let checkout = result.data;

                    try {
                        const url = await dispatchToStripe(products, userProducts, checkout);
                        return res.status(200).json({ success: true, url: url.url, sessionId: url.sessionId });
                    } catch (error) {
                        console.error('Error at dispatch: ', error);
                        return res.status(500).json({ success: false, message: error });
                    }
                }
            } catch (error) {
                console.error('Error at route: ', error);
                return res.status(500).json({ success: false, message: error });
            }
        }
    } catch (error) {
        console.error('Error at route', error);
        return res.status(500).json({ success: false, message: error });
    }
}

const updateCheckout = async (req, res) => {
    const payment_session = req.body;
    const userId = req.session.passport.user;

    try {
        const stripeSession = await paymentObject(payment_session);

        const payment_status = stripeSession.session.payment_status;
        const checkout_ref = stripeSession.session.client_reference_id;
        const stripe_status = stripeSession.session.status;

        if (payment_status == 'unpaid') {
            const result = await cartQueries.checkoutUpdates(payment_status, checkout_ref, stripe_status);
            return res.status(200).json({ success: true, message: 'Checkout updated - payment not processed.', data: result.data })

        } else {
            const result = await cartQueries.checkoutUpdates(payment_status, checkout_ref, stripe_status);

            if (result.error) {
                return res.status(400).json({ success: false, message: result.message });
            } else {

                const order_date = result.data.checkout_date;
                const checkout_id = result.data.id;

                const orders = await cartQueries.updateOrders(userId, order_date, checkout_id);

                if (orders.error) {
                    return res.status(400).json({ success: false, message: orders.message });
                } else {

                    try {
                        const cartId = result.data.cart_id;

                        const cartClose = await cartQueries.closeCart(cartId, userId);
                        if (!cartClose.error) {
                            return res.status(200).json({ success: true, message: orders.message, cart: 'Cart closed and new cart created.' })
                        } else {
                            return res.status(400).json({ success: false, message: cartClose.message })
                        }
                    } catch (error) {
                        console.warn('Error closing and opening cart: ', error);
                        return res.status(500).json({ success: false, message: error.message });
                    }
                }
            }
        }

    } catch (error) {
        console.error('Error at route: ', error);
        return res.status(500).json({ success: false, message: error.message });
    };
};

module.exports = {
    getFromCart,
    openCart,
    addToCart,
    updateCart,
    deleteItem,
    checkout,
    updateCheckout,
}