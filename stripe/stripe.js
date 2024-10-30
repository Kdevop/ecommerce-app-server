require('dotenv').config()

const stripe = require("stripe")(process.env.STRIPE_PRIVATE_KEY);


const dispatchToStripe = async (products, userProducts, checkout) => {

    try{
        let line_items = userProducts.map(item => {
            const product = products.find(p => p[0] === item.product_id)[1]; // Find the product details based on product_id
            return {
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: product.name,
                    },
                    unit_amount: product.priceInCents,
                },
                quantity: item.quantity,
            };
        });
    
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'payment',
            line_items: line_items,
            client_reference_id: checkout[0].id,
            success_url: `${process.env.CLIENT_URL}/success/{CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.CLIENT_URL}/cancel/{CHECKOUT_SESSION_ID}`,
        });

        return {error: false, url: session.url, sessionId: session.id}
    } catch (error) {
        console.error('This is the error: ', error);
        return {error: true, message: error.message};
    }
};

const paymentObject = async (payment_session) => {

    const sessionId = payment_session.stripeId;

    const object = await stripe.checkout.sessions.retrieve(sessionId)

    return {error: false, session: object}
}

module.exports = {
    dispatchToStripe,
    paymentObject,
};



