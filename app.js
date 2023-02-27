require('dotenv').config();
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const ejs = require("ejs");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');
const FacebookStrategy = require('passport-facebook').Strategy;

const app = express();

app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs')


app.use(bodyParser.urlencoded({extended: true}));

app.use(session({
    secret: "Our little secret",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect(process.env.MONGODB, {useNewUrlParser: true});

//Login sisten

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
    facebookId: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, {
        id: user.id,
        username: user.username,
        picture: user.picture
      });
    });
  });
  
  passport.deserializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, user);
    });
  });


passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,    
    callbackURL: "http://localhost:3000/auth/google/callback" 
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile)
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

//Facebook
passport.use(new FacebookStrategy({
    clientID: process.env.CLIENT_ID_FB,
    clientSecret: process.env.CLIENT_SECRET_FB,    
    callbackURL: "http://localhost:3000/auth/facebook/callback"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ facebookId: profile.id }, function (err, user) {
        console.log(profile)
        console.log(profile.displayName)
      return cb(err, user);
    });
  }
));

app.get('/auth/facebook',
  passport.authenticate('facebook'));

app.get('/auth/facebook/callback',
  passport.authenticate('facebook', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/index');
  });
//FB


//Contact Form
 const formSchema = new mongoose.Schema({
    name: String,
    email: String,
    subject: String,
    message: String
});

const Form = mongoose.model('Form', formSchema); 


// New Secret Schema
const secretSchema = new mongoose.Schema({
    message: String
})

const Secret = mongoose.model('Secret', secretSchema);


app.get("/", function(req,res) {
    if (req.isAuthenticated()){
       res.redirect("/index")
     } else {
        res.render("login.ejs")
     }
    
} );

app.get("/message", function(req,res){
    res.render("message.ejs")
})

app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile'] }));

app.get('/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/index');
  });

app.get("/register", function(req,res){
    res.render("register.ejs")
})


app.post("/register", function(req,res){
    User.register({username: req.body.username}, req.body.password, function(err, user){
        if (err){
            console.log(err)
            res.redirect("/register");
        } else {
            passport.authenticate("local")(req,res, function() {
                res.redirect("/index");
            })
        }
    })
})

app.get("/logout", function(req,res,next){
    req.logout(function(err){
        if (err) { return next(err)};
        res.redirect('/');
    });
});


 

app.get("/index", function(req,res) {
    if (req.isAuthenticated()){
        Secret.find({}, function(req,secrets){
            res.render("index.ejs", {
                secrets : secrets
            })
        })
     } else {
        res.redirect("/");
     }

    }) 
     
    app.post("/login", function(req,res){
        const user = new User({
         username: req.body.username, 
         password: req.body.password
        });
     
        req.login(user, function(err) {
         if (err) {
             console.log(err);
         } else {
             passport.authenticate("local")(req,res, function(){
                 res.redirect("/index");
             })
         }
        });
     })






app.get("/compose", function(req,res){
    res.render("compose.ejs")
})



 app.post('/submit', (req,res) => {
    // Create a new form submission
    const submission = new Form({
        name: req.body.name,
        email: req.body.email,
        subject: req.body.subject,
        message: req.body.message
    });
    // Save the submission to the database
    submission.save((error) => {
        if (error) {
            console.log(error);
            res.sendStatus(500);
        } else {
            console.log('Form submission saved to the database!');
            console.log(submission)
            res.redirect('/index')
        }
    })

    
}) 

app.post('/newsecret', (req,res) => {
    const secret = new Secret({
        message: req.body.message
    });

    secret.save((error) => {
        if (error){
            console.log(error)
        } else {
            console.log('Secret saved')
            console.log(secret)
            res.redirect('/')
        }
    })
})


app.listen(3000, () => {
    console.log('App listening on port 3000')
})






