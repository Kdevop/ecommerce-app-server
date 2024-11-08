// set up imports
const express = require('express');
require('dotenv').config();
const passport = require('passport');
const initializePassport = require('./controllers/auth.js');
const helmet = require('helmet');
const cors = require('cors');
const session = require('express-session');
const { DB, SS } =require('./config');

//route imports
const { registerRouter, signinRouter, logoutRouter, orderRouter, userRouter, checkRouter } = require('./routes/userRoute.js');
const { productRouter } = require('./routes/productRoute.js');
const { cartRouter } = require('./routes/cartRoute.js');
const pool = require('.db/index')

//server setup
const app = express();

app.set('trust proxy', 1)

// Used for testing to make sure server / express app is running.
app.get('/', (req, res, next) => {
    res.send('<h1>Hello Kiernan</h1>');
});

app.use(cors({
    origin: "https://ecommerce-quick.onrender.com",
    methods: ['POST', 'PUT', 'GET', 'OPTIONS', 'DELETE', 'HEAD'],
    credentials: true,
}));
app.use(helmet());
const pgSession = require('connect-pg-simple')(session);
const { PORT } =require('./config');
const port = PORT || 3001;
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
    store: new pgSession({
        pool: pool,
    }),
    resave: false, 
    saveUninitialized: false, 
    secret: SS.SS_SESS_SECRET,
    cookie: {
        maxAge: Number(SS.SS_SESS_LIFETIME),
        sameSite: 'lax', 
        secure: true,
        domain: "ecommerce-quick.onrender.com", 
        httpOnly: true,
        hostOnly: false,
    } 
}));

app.use(passport.initialize());
app.use(passport.session());

initializePassport(passport);

//configuration to allow the front end to store cookies created on the server:
app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "https://ecommerce-quick.onrender.com"); // update to match the domain you will make the request from
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.header("Access-Control-Allow-Credentials", true); // allows cookie to be sent
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, HEAD, DELETE"); // you must specify the methods used with credentials. "*" will not work. 
    next();
});

//route for users
app.use('/api/users/register', registerRouter);
app.use('/api/users/signin', signinRouter);
app.use('/api/users/logout', logoutRouter);
app.use('/api/users/orders', orderRouter);
app.use('/api/users/details', userRouter);
app.use('/api/users/check-session', checkRouter);

//route for products
app.use('/api/products', productRouter);

//route for cart
app.use('/api/cart', cartRouter)

//app.listen
app.listen(port, () => {
    console.log(`Your server is listening on port: ${port}`);
});

// const options = {
//     user: DB.DB_USER, 
//     host: DB.DB_HOST,
//     database: DB.DB_DATABASE,
//     password: DB.DB_PASSWORD,
//     port: DB.DB_PORT,
//     createDatabaseTable: true,
//     createTableIfMissing: true
// };

// console.log("these are the details from options server.js",options);

// const sessionStore = new pgSession(options);

// app.use(session({
//     name: SS.SS_SESS_NAME,
//     resave: false, 
//     saveUninitialized: false, 
//     store: sessionStore,
//     secret: SS.SS_SESS_SECRET,
//     cookie: {
//         maxAge: Number(SS.SS_SESS_LIFETIME),
//         sameSite: 'lax', 
//         secure: true,
//         domain: "ecommerce-quick.onrender.com", 
//         httpOnly: true,
//         hostOnly: false,
//     } 
// }));
