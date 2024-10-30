const express = require('express');
const passport = require('passport');
const { registerUser, userOrders, orderDetails, getUserDetails, updateUser, addAddress, editAddress } = require('../controllers/user');
const { isAuth } = require('../controllers/auth');

//endpoint for register
const registerRouter = express.Router();
registerRouter.post('/', registerUser);

//end point for signin
const signinRouter = express.Router();
signinRouter.post('/', (req, res, next) => {
    passport.authenticate('local', async (err, user, info) => {
        if (err) {
            return res.status(500).json({ error: 'Internal Server Error' });
        }
    
        if (!user) {
            return res.status(401).json ({ message: info.message, check: 'this is the error I am getting today' });
        }
        req.login(user, (loginErr) => {
            if (loginErr) {
                return res.status(500).json({ error: 'Login Error', msg: loginErr });
            }
            return res.status(200).json({ user }); 
        });
    }) (req, res, next);
});

//end point for logging out
const logoutRouter = express.Router();
logoutRouter.post('/', (req, res, next) => {
    req.logout((err) => {
        if(err) {
            return next(err);
        }

        //Destroy the session
        req.session.destroy((err) => {
            if (err) {
                return next(err);
            }
        
            // clear the cookie
            res.clearCookie('ecommerce2024', { 
                path: '/',
                domain: 'localhost',
             });

            res.status(200).json({ success: true, message: 'Logged out' });
        });
    });
});

const checkRouter = express.Router();
checkRouter.get('/', isAuth, (req, res) => {
    res.status(200).json(req.session.passport.user);
});

//end point for user orders
const orderRouter = express.Router();
//end point for user purchase history
orderRouter.get('/:userId', isAuth, userOrders);
//end point for details on a single order
orderRouter.get('/details/:orderId', isAuth, orderDetails); 

// end point for customer details
const userRouter = express.Router();
//end point for user details
userRouter.get('/userId', isAuth, getUserDetails);
//end point for updating user details
userRouter.put(`/userId`, isAuth, updateUser);
userRouter.post('/address', isAuth, addAddress);
userRouter.put('/address', isAuth, editAddress);

// exports
module.exports = {
    registerRouter,
    signinRouter,
    logoutRouter,
    orderRouter,
    userRouter,
    checkRouter,
};

