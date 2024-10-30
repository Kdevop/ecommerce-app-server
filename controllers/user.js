const bcrypt = require('bcrypt');
const Queries = require('../db/queries');
const passport = require('passport');

const userQuerySchema = { name: 'user', userDetails: '', userAddress: '', userData: '' };
const ordersQuerySchema = { name: 'orders', userDetails: '' };
const addressQuerySchema = {name: 'address', }

const userQueries = new Queries(userQuerySchema);
const ordersQueries = new Queries(ordersQuerySchema);

const registerUser = async (req, res) => {

    const validateEmail = (email) => {
        const re = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;
        return re.test(String(email).toLowerCase());
    };

    const { password, email, first_name, last_name } = req.body;

    console.log(password, email, first_name, last_name);


    if (!validateEmail(email)) {
        return res.status(400).json({ success: false, message: 'Invalid email format at controllers checks' });
    }

    //Input validation
    if (!password || !email || !first_name || !last_name) {
        return res.status(400).json({ success: false, message: 'All fields are required - failed at user.js' });
    }

    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const userDetails = { hashedPassword, email, first_name, last_name };

        const registerQuerySchema = { name: 'register', userDetails };
        const registerQueries = new Queries(registerQuerySchema);

        const data = await registerQueries.registerUser(userDetails);

        if (!data.error) {
            // req.session.user = data.data.data.id;  I am not sure about this, I have set it up so you are routed to log in, if you register...
            // req.session.authenticated = true;

            res.status(200).json({ success: true, message: data.message, data: data.data });

        } else {
            res.status(400).json({ success: false, message: data.message });

        }
    } catch (error) {
        res.status(500).json({ success: false, message: 'An error occurred during registration.' });
    }
};

const userOrders = async (req, res) => {
    const { userId } = req.params; 

    const Id = req.session.passport.user

    if (Id === userId) { 
        try {
            const result = await ordersQueries.ordersOverview(userId);
            if (!result.error) {
                res.status(200).json({ success: true, hasOrders: result.hasOrders, message: 'Customer orders returned', data: result.data });
            } else {
                res.status(400).json({ success: false, message: result.message})
            }
        } catch (error) {
            console.error('Error getting customer orders: ', error);
            res.status(500).json({ success: false, message: 'An error occured collecting the customer orders', data: result})
        }
    } else {
        res.status(401).json({ success: false, message: 'Please login.' })
    }
};

const orderDetails = async (req, res) => {
    const { orderId } = req.params;
    try {
        const result = await ordersQueries.orderIdDetails(orderId);
        if (result.error) { 
            res.status(400).json({ success: false, message: result, message });
        } else {
            res.status(200).json({ success: true, message: 'Order details returned', checkout_data: result.checkout, products_data: result.product });
        }
    } catch (error) {
        console.error('Error getting customer order details: ', error);
        res.status(500).json({ success: false, message: 'Error getting customer order details', error });
    }
};

const getUserDetails = async (req, res) => {

    const userId = req.session.passport.user;

    try {
        const userConf = userId;
        userQueries.userConf = userConf;

        const userData = await userQueries.customerDetails(userId);

        if (!userData.error) {
            res.status(200).json({ success: true, message: 'User details returned', user: userData.user, address: userData.address, userData: userData.userData, addressData: userData.addressData });
        } else {
            res.status(400).json({ success: false, message: userData.message });
        }
    } catch (error) {
        console.error('Error collecting user details: ', error);
        res.status(500).send({ success: false, message: 'An error occured collecting your details' });
    }

};

const updateUser = async (req, res) => {

    const userId = req.session.passport.user;

    const changes = req.body;

    console.log(`These are the details in the req.body user.js ${changes}`);

    try {
        const result = await userQueries.updateUserDetails( changes, userId );
        if (result.error) {
            return res.status(400).json({success: false, message: result.message, data: result});
        } else {
            res.status(200).json({ success: true, message: 'User details updated successfully', data: result.data });
        }
        
    } catch (error) {
        console.error('Error updating user details: ', error);
        res.status(500).json({ success: false, message: 'Error updating user details', error: error.message });
    }
}

const addAddress = async (req, res) => {
    const userId = req.session.passport.user;
    const newAddress = req.body;

    try{
        const result = await userQueries.inputAddress( newAddress, userId );

        if(result.error) {
            return res.status(400).json({ success: false, message: result.message, data: result });
        } else {
            res.status(200).json({success: true, message: 'Address added successfuly', data: result.data });
        }

    } catch (error) {
        console.error('Error updating user details: ', error);
        res.status(500).json({ success: false, message: 'Error adding address', error: error.message });
    }
}

const editAddress = async (req, res) => {
    const userId = req.session.passport.user;
    const newAddress = req.body;

    console.log('This is the address on line 167', newAddress);

    try{
        const result = await userQueries.amendAddress( newAddress, userId );

        if(result.error) {
            return res.status(400).json({ success: false, message: result.message, data: result });
        } else {
            res.status(200).json({ success: true, message: 'Address amended successfuly', data: result.data });
        }
    } catch (error) {
        console.error('Error updating address: ', error);
        res.status(500).json({ success: false, message: 'Error updating address', error: error.message });
    }
}

module.exports = {
    registerUser,
    userOrders,
    orderDetails,
    getUserDetails,
    updateUser,
    addAddress,
    editAddress,
};
