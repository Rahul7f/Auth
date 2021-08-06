require('dotenv').config() //to store secrets like api key and others
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require('mongoose');
const session = require('express-session')
const passport = require('passport')
const passportLocalMongoose = require('passport-local-mongoose');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
var findOrCreate = require('mongoose-findorcreate')


//use or initializes
const app = express();
app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({
    extended: true
}));

app.use(express.static("public"));//to acess css  by server by public folder
//to store cookie and sessions
app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: true }
}))

app.use(passport.initialize());
app.use(passport.session());


// connect mongodb to localserver
mongoose.connect('mongodb://localhost:27017/userDB', { useNewUrlParser: true, useUnifiedTopology: true, });

//define our schemea
const userScheme = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
    secret: String

});
//we can switch between multiple plugins. here plugin is defined 
userScheme.plugin(passportLocalMongoose)
userScheme.plugin(findOrCreate)

// create model
const User = new mongoose.model("User", userScheme);
//to store cokkies and session by using id
passport.use(User.createStrategy());
passport.serializeUser(function (user, done) {
    done(null, user.id);
});

passport.deserializeUser(function (id, done) {
    User.findById(id, function (err, user) {
        done(err, user);
    });
});

//for google signup
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secret",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
},
    function (accessToken, refreshToken, profile, cb) {
        console.log(profile);
        User.findOrCreate({ googleId: profile.id }, function (err, user) {
            return cb(err, user);
        });
    }
));
//----------------routes tarted--------------------------//

//route for home page
app.get("/", function (req, res) {
    res.render("home")
})

//route for login page
app.get("/login", function (req, res) {
    res.render("login")
})

// route for submit page 
// here user can type there secret and submit
app.get("/submit", function (req, res) {
    if (req.isAuthenticated) {
        res.render("submit")
        console.log("you are authanticate");
        
    } else {
        console.log("user not authanticate");
    }
})

// here user can only view there secret after authnticate
app.get("/secrets", function (req, res) {
    if (req.isAuthenticated) {
        res.render("secrets")
      
        console.log(req.user.username );
        
    } else {

        console.log("user not login");
    }
})
// logout and got home page
app.get("/logout", function (req, res) {
    req.session.destroy()
    res.redirect("/");
})

// route register  page 
app.get("/register", function (req, res) {
    res.render("register")
})


// post request to register page get user input  to register
app.post("/register", function (req, res) {

    User.register({ username: req.body.username }, req.body.password, function name(err, user) {
        if (err) {
            console.log(err);
            res.redirect("/register");
            console.log("error occure");
        }
        else {
            passport.authenticate('local')(req, res, function () {
                res.redirect('/secrets');
                console.log(user);
            })
        }
    });




})

// post request to login page get user input  to login 
app.post("/login", function (req, res) {
    const user = new User({
        username: req.body.username,
        password: req.body.password
    })
    req.login(user, function (err) {
        if (err) {
            console.log(err);
        } else {
            passport.authenticate('local')(req, res, function () {
                console.log(user);
                res.redirect('/secrets');
            })
        }
    })
})



// choose accout to login or regestration  with google anf get all profile data
app.get('/auth/google',
    passport.authenticate('google', { scope: ['profile'] }));

    // after choose account authanticate user
app.get('/auth/google/secret',
    passport.authenticate('google', { failureRedirect: '/login' }),
    function (req, res) {
        // Successful authentication, redirect home.
        res.redirect('/secrets');
    });

    // port listne 
app.listen(3000, function () {
    console.log("Server started on port 3000");
});