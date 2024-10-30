require('dotenv').config();
const pool = require('./index');
const bcrypt = require('bcrypt');

class Queries {
    constructor(schema) {
        this.schema = schema;
    }

    async registerUser() {
        const { hashedPassword, email, first_name, last_name } = this.schema.userDetails;

        // Input validation
        if (!hashedPassword || !email || !first_name || !last_name) {
            return { error: true, message: "All fields are required - failed at db.queries." };
        }

        const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;
        if (!emailRegex.test(email)) {
            return { error: true, message: "Invalid email format at DB checks" };
        }

        try {
            const user = await pool.query(
                `INSERT INTO "user_customer" ("password", "email", "first_name", "last_name") VALUES($1, $2, $3, $4) RETURNING "id"`,
                [hashedPassword, email, first_name, last_name]
            );

            if (user) {

                try {
                    const id = user.rows[0].id;

                    const newCartQuery = 'INSERT INTO cart (user_id, open) VALUES ($1, $2) RETURNING *';
                    const newCart = await pool.query(newCartQuery, [id, true])

                    return {
                        error: false, registered: true, cart: true, message: 'You are registered and a cart intitialized', data: {
                            user: user.rows[0],
                            cartId: newCart.rows[0]
                        }
                    }

                } catch (error) {
                    console.log('This is the error we are getting on the cart: ', error)
                    return {
                        error: true, registered: true, cart: false, message: 'You are registered but a cart could not be initialized.', data: {
                            user: user.rows[0]
                        }
                    }
                }
            }

        } catch (err) {
            return { error: true, message: "A problem occurred. Please try a different email." };
        }
    };

    async getAllFromSchema() {
        try {
            const query = `SELECT * FROM ${this.schema.name}`;
            const products = await pool.query(query);
            return { error: false, data: products.rows };
        } catch (error) {
            return { error: true, message: error.message }
        }
    };

    async getFromSchemaById() {
        try {

            const query = `SELECT * FROM products WHERE id = $1`;
            const product = await pool.query(query, [this.schema.id]);

            return { error: false, data: product.rows[0] }
        } catch (error) {
            return { error: true, message: error.message }
        }
    };

    async getFromSchemaByCategory(category) {

        const id = category.category;

        try {
            const query = `SELECT * FROM products WHERE category_id = $1`;
            const products = await pool.query(query, [id]);

            return { error: false, data: products.rows };
        } catch (error) {
            console.error({ message: "Error fetching products by category", error });
            return { error: true, message: "An error occured while fetching products. Please try again later." };
        }
    };

    async getFromSchemaByName() {
        try {
            const query = `SELECT * FROM products WHERE name =$1`;
            const products = await pool.query(query, [this.schema.product]);

            return { error: false, data: products.rows };
        } catch (error) {
            console.error({ message: 'Error fetching products by name', error });
            return { error: true, message: 'An error occcured while fetching products. Please try again later.' }
        }
    };

    async ordersOverview(userId) {
        try {
            const result = await pool.query('SELECT * FROM orders WHERE user_id = $1', [userId]);

            if (result.rows.length === 0) {
                return { error: false, hasOrders: false, data: result.rows }
            }
            return { error: false, hasOrders: true, data: result.rows };
        } catch (error) {
            console.error({ message: 'Error collecint orders: ', error });
            return { error: true, message: error.message };
        }
    };

    async orderIdDetails(orderId) {
        try {

            //you might need more work here, because you will want the products and for those you need to get to cart_products
            const checkout = await pool.query('SELECT * FROM orders INNER JOIN checkout ON orders.checkout_id = checkout.id INNER JOIN shipping_address ON checkout.shipping_address_id = shipping_address.id WHERE orders.id = $1', [orderId]);

            const cartId = checkout.rows[0].cart_id;

            const products = await pool.query('SELECT * FROM cart_products WHERE cart_id = $1', [cartId]);

            return { error: false, checkout: checkout.rows[0], product: products.rows };
        } catch (error) {
            console.error({ message: 'Error collecting order details', error });
            return { error: true, message: error.message };
        }
    };

    async customerDetails(userId) {
        try {
            const userDetails = await pool.query('SELECT id, email, first_name, last_name FROM user_customer WHERE id = $1', [userId]);
            if (userDetails.rows.length === 0) {
                return { error: true, message: 'User not found' };
            } else {
                //return { error: false, data: result.rows[0] };
                // query address here
                const userAddress = await pool.query('SELECT * FROM billing_address WHERE user_id = $1', [userId]);

                if (userAddress.rows.length === 0) {
                    return { error: false, user: true, address: false, userData: userDetails.rows[0] };
                } else {
                    return { error: false, user: true, address: true, userData: userDetails.rows[0], addressData: userAddress.rows[0] };
                }
            }
        } catch (error) {
            console.error({ message: 'Error collecting customer details', error });
            return { error: true, message: error.message };
        }
    };

    async updateUserDetails(changes, userId) {
        const { email, password, firstName, lastName } = changes;

        console.log('this is the changes object in updateUserDetails', changes);
        console.log(firstName);
        console.log(lastName);

        let fields = [];
        let values = [];

        if (changes.email) {
            fields.push('email');
            values.push(email);
        }

        if (changes.password) {
            const salt = await bcrypt.genSalt(10);
            const hash = await bcrypt.hash(password, salt);
            fields.push('password');
            values.push(hash);
        }

        if (changes.firstName) {
            fields.push('first_name');
            values.push(firstName);

        }

        if (changes.lastName) {
            fields.push('last_name');
            values.push(lastName);
        }

        console.log(fields);
        console.log(values);

        const setClause = fields.map((field, index) => `${field} = $${index + 1}`).join(', ');
        console.log(setClause);
        console.log(`UPDATE user_customer SET ${setClause} WHERE id = $${fields.length + 1} Returning *`, [...values, userId])
        if (fields.length === 0) {
            return { error: true, message: 'Nothing to update' };
        } else {
            try {
                //this query below needs checking and also we need to return all the details. 
                const updates = await pool.query(`UPDATE user_customer SET ${setClause} WHERE id = $${fields.length + 1} RETURNING id, email, first_name, last_name`, [...values, userId]);
                console.log(updates);

                if (updates.rows.length === 0) {
                    return { error: true, message: 'Error collecting changes' }
                }

                return { error: false, message: 'Details updated', data: updates.rows[0] };
            } catch (error) {
                return { error: true, message: error.message }
            }
        }
    };

    async inputAddress(newAddress, userId) {
        const user = userId;
        const { address_line_1, address_line_2, city, county, post_code } = newAddress;

        if (!address_line_1 || !address_line_2 || !city || !county || !post_code) {
            return { error: true, message: "All fields are required - failed at db.queries." };
        }

        try {
            const addAddress = await pool.query(
                `INSERT INTO "billing_address" ("user_id", "address_line1", "address_line2", "city", "county", "post_code") VALUES($1, $2, $3, $4, $5, $6) RETURNING *`,
                [user, address_line_1, address_line_2, city, county, post_code]
            );

            console.log(addAddress);

            if (addAddress.rows.length === 0) {
                return { error: true, message: 'Error adding address' };
            }

            return { error: false, message: 'Address added', data: addAddress.rows[0] };

        } catch (error) {
            return { error: true, message: error.message };
        }
    };

    async amendAddress(newAddress, userId) {
        const user = userId;
        const { address_line_1, address_line_2, city, county, post_code } = newAddress;

        console.log('This is the address in queries: ', newAddress);

        if (!address_line_1 || !address_line_2 || !city || !county || !post_code) {
            return { error: true, message: "All fields are required - failed at db.queries." };
        }

        try {
            const editAddress = await pool.query(
                `UPDATE billing_address SET address_line1 = $1, address_line2 = $2, city = $3, county = $4, post_code = $5 WHERE user_id = $6 RETURNING *`,
                [address_line_1, address_line_2, city, county, post_code, user]
            );

            console.log(editAddress);

            if (editAddress.rows.length === 0) {
                return { error: true, message: "Error editing address" };
            }

            return { error: false, message: "Address amended", data: editAddress.rows[0] };

        } catch (error) {
            return { error: true, message: error.message };
        }

    }

    async initCart(userId) {

        try {
            const cartExistQuery = `SELECT * FROM cart WHERE user_id = $1 AND open = $2`;
            const cartExists = await pool.query(cartExistQuery, [userId, true]);

            // If cart already exist, return the cart.
            if (cartExists.rows.length > 0) {
                return this.cartDetails(userId);
            } else {
                const newCartQuery = 'INSERT INTO cart (user_id, open) VALUES ($1, $2) RETURNING *';
                const newCart = await pool.query(newCartQuery, [userId, true]);
                return { error: false, exists: true, message: 'A cart has been opened', data: newCart.rows[0] };
            }
        } catch (error) {
            console.error({ message: 'Error contacting SQL to open cart', error });
            return { error: true, exists: false, message: 'Unable to open a new cart. Try block failed.' };
        }
    };

    async cartDetails(customerId) {

        try {
            const cartProdQuery = `SELECT * FROM cart
                                    INNER JOIN cart_products
                                    ON cart.id = cart_products.cart_id
                                    WHERE user_id = $1 AND cart.open = true`;
            const cartProducts = await pool.query(cartProdQuery, [customerId.customerId]);
            if (cartProducts.rows.length === 0) {
                return { error: false, hasProd: false, message: 'There are no products in your cart', data: cartProducts.rows };
            } else {
                return { error: false, hasProd: true, message: 'Here are the products in your cart', data: cartProducts.rows };
            }
        } catch (error) {
            console.error({ message: 'Error in returning cart products at queries', error });
            return { error: true, message: 'Unable to return your cart at the moment. Please try again later.' };
        }
    };

    async addProductToCart(addProducts) {
        const { customerId, product, quantity, price, name, url } = addProducts;

        try {
            //get the cart for the current user
            const cartQuery = `SELECT id FROM cart WHERE user_id = $1 AND open = $2`;
            const cartResult = await pool.query(cartQuery, [customerId, true]);

            if (cartResult.rows.length === 0) {
                return { error: true, message: 'User does not have a cart' };
            }

            const cartId = cartResult.rows[0].id;

            const insertQuery = `INSERT INTO cart_products (cart_id, product_id, quantity, product_price, product_name, product_url) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`;
            const insertResult = await pool.query(insertQuery, [cartId, product, quantity, price, name, url]);

            return { error: false, data: insertResult.rows };
        } catch (error) {
            console.error({ message: 'Error adding product to cart', error });
            return { error: true, message: 'Unable to add product to cart. Please try again later.' };
        }
    };

    async amendCart(amendProducts) {
        const { customerId, products, quantity } = amendProducts;
        try {
            const cartQuery = `SELECT id FROM cart WHERE user_id = $1 AND open = $2`;
            const cartResult = await pool.query(cartQuery, [customerId, true]);

            const cartId = cartResult.rows[0].id;

            const updateQuery = `UPDATE cart_products SET quantity = $1 WHERE cart_id = $2 AND product_id = $3 RETURNING *`; //this need amending, becuase you need to update the quantity of the product for the cart Id.
            const updateResult = await pool.query(updateQuery, [quantity, cartId, products]);

            return { error: false, data: updateResult.rows }

        } catch (error) {
            console.error({ message: 'Error adding product to cart', error });
            return { error: true, message: 'Unable to add product to cart, Please try again later.' };
        }
    };

    async removeFromCart(deleteProducts) {

        const { customerId, product } = deleteProducts;

        try {
            const cartQuery = `SELECT id FROM cart WHERE user_id = $1 AND OPEN = $2`;
            const cartResult = await pool.query(cartQuery, [customerId, true]);

            const cartId = cartResult.rows[0].id;

            const deleteQuery = `DELETE FROM cart_products WHERE cart_id = $1 AND product_id = $2 RETURNING *`; //this needs amending because you need the cart returned. 
            const deleteResult = await pool.query(deleteQuery, [cartId, product]);

            return { error: false, data: deleteResult.rows };

        } catch (error) {
            console.error({ message: 'Error deleting product from cart', error });
            return { error: true, message: 'unable to delete product. Failed as query.' }
        }
    };

    async updateShipping(newAddress, userId) {
        const user = userId;
        const { address_line1, address_line2, city, county, post_code } = newAddress;

        if (!address_line1 || !address_line2 || !city || !county || !post_code) {
            return { error: true, message: "All fields are required - failed at db.queries." };
        }

        try {
            const addAddress = await pool.query(
                `INSERT INTO "shipping_address" ("user_id", "address_line1", "address_line2", "city", "county", "post_code") VALUES($1, $2, $3, $4, $5, $6) RETURNING *`,
                [user, address_line1, address_line2, city, county, post_code]
            );

            if (addAddress.rows.length === 0) {
                return { error: true, message: 'Error adding address' };
            }

            return { error: false, message: 'Address added', data: addAddress.rows[0] };

        } catch (error) {
            return { error: true, message: error.message };
        }
    }

    //for this function you need to get a table of products
    //you already have the cart details, but you might want a more specific query on this, so you can hand that over.
    async checkoutData(sendToCheckout) {
        const { cartId, userId, shippingAddress, billingAddress } = sendToCheckout;
        const status = 'open';
        const paymentMethod = 'card';
        let shippingId = null;

        //if shipping address is the same as billing - enter billing address into shipping.
        // you still need to action if they want a new address. 
        if (!shippingAddress) {
            try {
                const userAddress = await pool.query('SELECT * FROM billing_address WHERE user_id = $1', [userId]);
                const newAddress = userAddress.rows[0];

                const addShipping = await this.updateShipping(newAddress, userId);

                shippingId = addShipping.data.id;

            } catch (error) {
                console.log('Error from adding the shipping address: ', error);
                return { error: true, message: error.message };
            }
        }

        try {

            const cartQuery = `SELECT product_id, quantity, product_price FROM cart_products WHERE cart_id = $1`;
            const fetchCart = await pool.query(cartQuery, [cartId]);

            if (fetchCart.rows.length === 0) {
                console.error({ message: 'These is nothing in your cart.' });
                return { error: true, message: 'Your cart is currently empty.' };
            } else {
                let totalPrice = 0;
                for (let item of fetchCart.rows) {
                    totalPrice += item.quantity * parseFloat(item.product_price.replace('$', ''));
                }

                const date = new Date();
                const month = date.getMonth() + 1;
                const today = `${date.getFullYear()}-${month}-${date.getDate()}`;

                const checkoutQuery = `INSERT INTO checkout (billing_address_id, shipping_address_id, total_amount, checkout_date, checkout_status, cart_id, payment_method) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`;
                const createCheckout = await pool.query(checkoutQuery, [billingAddress, shippingId, totalPrice, today, status, cartId, paymentMethod]);

                if (createCheckout.rows.length === 0) {
                    console.error({ message: `Unable to create checkout` });
                    return { error: true, message: 'Unable to process checkout' };
                } else {
                    return { error: false, message: 'Checkout ready to be processed.', data: createCheckout.rows };
                }
            }
        } catch (error) {
            console.error('Unable to process at query.', error);
            return { error: true, message: 'Unable to process at query.' };
        }
    };

    async dataForStripe(stripe) {

        const { cartId, userId } = stripe;

        let userProducts = [];
        let products = [];

        try {
            const cartQuery = `SELECT product_id, quantity FROM cart_products WHERE cart_id = $1`;
            const cart = await pool.query(cartQuery, [cartId]);

            if (cart.rows.length === 0) {
                return { error: true, message: 'There are no products in your cart', data: cart };
            } else {

                userProducts = cart.rows;

                const productQuery = `SELECT p.id, name, price FROM products p
                                        JOIN cart_products cp ON p.id = cp.product_id
                                        WHERE cp.cart_id = (SELECT id FROM cart WHERE user_id = $1 AND open = true);`;
                const productsData = await pool.query(productQuery, [userId]);

                if (productsData.rows.length === 0) {
                    return { error: true, message: 'Error fetching products.' };
                } else {
                    products = productsData.rows.map(item => {
                        const { id, name, price } = item;
                        const priceInCents = parseFloat(price.replace('$', '')) * 100;
                        return [id, { priceInCents, name }];
                    })
                }

                return { error: false, message: 'Here is the data for stripe', userProducts: userProducts, products: products };
            }
        } catch (error) {
            console.log(error);
            return { error: true, message: error.message };
        }
    }

    async checkoutUpdates(payment_status, checkout_ref, stripe_status) {

        try {

            const checkoutQuery = `UPDATE checkout SET checkout_status = $1 WHERE id = $2 RETURNING *`
            const checkoutData = await pool.query(checkoutQuery, [payment_status, checkout_ref]);

            if (checkoutData.rows.length === 0) {
                return { error: true, message: 'Error updating checkout' }
            } else {
                return { error: false, message: 'checkoutUpdated', data: checkoutData.rows[0] };
            }

        } catch (error) {
            console.warn(error);
            return { error: true, message: error.message };
        };
    };

    async updateOrders(userId, order_date, checkout_id) {

        const order_status = 'SHIPPED';

        try {
            const orderExistsQuery = `SELECT * FROM orders WHERE checkout_id = $1`;
            const orderExists = await pool.query(orderExistsQuery, [checkout_id]);

            if (orderExists.rows.length > 0) {
                return { error: false, message: 'order already in table', data: orderExists.rows[0] };
            }

            const ordersQuery = `INSERT INTO orders (user_id, order_date, order_status, checkout_id) VALUES ($1, $2, $3, $4) RETURNING *`;
            const insertOrders = await pool.query(ordersQuery, [userId, order_date, order_status, checkout_id]);

            if (insertOrders.rows.length === 0) {
                return { error: true, message: 'Error inserting into orders' };
            } else {
                return { error: false, message: 'Orders updated.', data: insertOrders.rows[0] };
            }
        } catch (error) {
            console.warn(error);
            return { error: true, message: error.message };
        };
    };

    async closeCart(cartId, userId) {

        try {
            const updateQuery = `UPDATE cart SET open = $1 WHERE id = $2 RETURNING *`;
            const updateResult = await pool.query(updateQuery, [false, cartId]);

            if (!updateResult.error) {
                try {
                    const newCart = this.initCart(userId);

                    if (!newCart.error) {
                        return { error: false, cartUpdate: updateResult.rows, newCart: newCart.data };
                    }

                } catch (error) {
                    console.error({ message: 'Error opening new cart: ', error });
                    return { error: true, message: error.message }
                }
            }
        } catch (error) {
            console.error({ message: 'Error closing cart', error });
            return { error: true, message: error.message };
        }
    }
};

module.exports = Queries;