// load all the things we need
var LocalStrategy   = require('passport-local').Strategy;
var FacebookStrategy = require('passport-facebook').Strategy;
var TwitterStrategy  = require('passport-twitter').Strategy;
var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;

var configAuth = require('./auth');
var bcrypt   = require('bcrypt-nodejs');
var mysql = require("mysql");

var configDB = require('./database');
var connection = mysql.createConnection(configDB.connection);
connection.query('USE ' + configDB.database);

// expose this function to our app using module.exports
module.exports = function(passport) {

    // =========================================================================
    // passport session setup ==================================================
    // =========================================================================
    // required for persistent login sessions
    // passport needs ability to serialize and unserialize users out of session

    // used to serialize the user for the session
    passport.serializeUser(function(user, done) {

        done(null, user.userID);
    });

    // used to deserialize the user
    passport.deserializeUser(function(id, done) {

        connection.query("SELECT * FROM user WHERE userID = ? ",[id], function(err, rows){
            done(err, rows[0]);
        });
    });

    // =========================================================================
    // LOCAL SIGNUP ============================================================
    // =========================================================================
    passport.use('local-signup', new LocalStrategy({
        // by default, local strategy uses username and password, we will override with email
        usernameField : 'email',
        passwordField : 'password',
        passReqToCallback : true // allows us to pass in the req from our route (lets us check if a user is logged in or not)
    },
    function(req, email, password, done) {

        var roleID = req.body.userrole;

        if (email)
            email = email.toLowerCase(); // Use lower-case e-mails to avoid case-sensitive e-mail matching

            connection.query("SELECT * FROM user WHERE email = ?",[email], function(err, rows) {

                if (err)
                    return done(err);

                if (rows.length) {

                    return done(null, false, req.flash('signupMessage', 'That email already exists.'));

                } else {

                    var newUserMysql = {
                      email: email,
                      password: bcrypt.hashSync(password, null, null),
                      Role_RoleID: roleID,
                      organization_organizationID: 1
                    };

                    var insertQuery = "INSERT INTO user ( email, password, Role_RoleID, organization_organizationID) values (?,?,?,?)";

                    connection.query(insertQuery,[
                      newUserMysql.email,
                      newUserMysql.password,
                      newUserMysql.Role_RoleID,
                      newUserMysql.organization_organizationID
                    ], function(err, rows) {

                        if (err)
                            return done(err);

                        newUserMysql.userID = rows.insertId;

                        return done(null, newUserMysql);
                    });
                }
            });

    }));

    // =========================================================================
    // LOCAL LOGIN =============================================================
    // =========================================================================
    // we are using named strategies since we have one for login and one for signup
    // by default, if there was no name, it would just be called 'local'

    passport.use('local-login', new LocalStrategy({
        // by default, local strategy uses username and password, we will override with email
        usernameField : 'email',
        passwordField : 'password',
        passReqToCallback : true // allows us to pass back the entire request to the callback
    },
    function(req, email, password, done) { // callback with email and password from our form

      connection.query("SELECT * FROM user WHERE email = ?",[email],
        function(err, rows) {

          if (err)
              return done(err);

          if (!rows.length) {
              return done(null, false, req.flash('loginMessage', 'No user found.')); // req.flash is the way to set flashdata using connect-flash
          }

          // if the user is found but the password is wrong
          if (!bcrypt.compareSync(password, rows[0].password))
              return done(null, false, req.flash('loginMessage', 'Oops! Wrong password.')); // create the loginMessage and save it to session as flashdata

          // all is well, return successful user
          return done(null, rows[0]);
      });

    }));


    // =========================================================================
    // FACEBOOK ================================================================
    // =========================================================================
    passport.use(new FacebookStrategy({

        // pull in our app id and secret from our auth.js file
        clientID        : configAuth.facebookAuth.clientID,
        clientSecret    : configAuth.facebookAuth.clientSecret,
        callbackURL     : configAuth.facebookAuth.callbackURL,
        passReqToCallback : true // allows us to pass in the req from our route (lets us check if a user is logged in or not)
        // profileFields: ["emails", "displayName", "name"]
    },

    // facebook will send back the token and profile
    function(req, token, refreshToken, profile, done) {

      var newUserMysql = {
        username: profile.displayName,
        Role_RoleID: 1,
        organization_organizationID: 1,
        facebook_id: profile.id,
        facebook_name: profile.displayName,
        facebook_token: token
      };

      connection.query("SELECT * FROM user WHERE facebook_id = ?",[profile.id],
        function(err, rows) {

          if (err)
              return done(err);

          if (!rows.length) {
            // adding the user to the DB if none is found:

            var insertQuery = "INSERT INTO user ( username, Role_RoleID, organization_organizationID ,facebook_id, facebook_name, facebook_token) values (?,?,?,?,?,?)";

            connection.query(insertQuery,[
              newUserMysql.username,
              newUserMysql.Role_RoleID,
              newUserMysql.organization_organizationID,
              newUserMysql.facebook_id,
              newUserMysql.facebook_name,
              newUserMysql.facebook_token
            ], function(err, rows) {

                if (err)
                    return done(err);

                newUserMysql.userID = rows.insertId;

                return done(null, newUserMysql);
            });
          }

          // all is well, return successful user
          return done(null, rows[0]);
      });

    }));

    // =========================================================================
    // TWITTER =================================================================
    // =========================================================================
    passport.use(new TwitterStrategy({
        consumerKey     : configAuth.twitterAuth.consumerKey,
        consumerSecret  : configAuth.twitterAuth.consumerSecret,
        callbackURL     : configAuth.twitterAuth.callbackURL
    },
    function(req, token, tokenSecret, profile, done) {

      var newUserMysql = {
        username: profile.displayName,
        Role_RoleID: 2,
        organization_organizationID: 1,
        twitter_id: profile.id,
        twitter_token: token,
        twitter_username: profile.username,
        twitter_displayname: profile.displayName
      };

      connection.query("SELECT * FROM user WHERE twitter_id = ?",[profile.id],
        function(err, rows) {

          if (err)
              return done(err);

          if (!rows.length) {
            // adding the user to the DB if none is found:

            var insertQuery = "INSERT INTO user ( username, Role_RoleID, organization_organizationID ,twitter_id, twitter_token, twitter_username, twitter_displayname) values (?,?,?,?,?,?,?)";

            connection.query(insertQuery,[
              newUserMysql.username,
              newUserMysql.Role_RoleID,
              newUserMysql.organization_organizationID,
              newUserMysql.twitter_id,
              newUserMysql.twitter_token,
              newUserMysql.twitter_username,
              newUserMysql.twitter_displayname
            ], function(err, rows) {

                if (err)
                    return done(err);

                newUserMysql.userID = rows.insertId;

                return done(null, newUserMysql);
            });
          }

          // all is well, return successful user
          return done(null, rows[0]);
      });

    }));


    // =========================================================================
    // GOOGLE ==================================================================
    // =========================================================================
    passport.use(new GoogleStrategy({
      clientID        : configAuth.googleAuth.clientID,
       clientSecret    : configAuth.googleAuth.clientSecret,
       callbackURL     : configAuth.googleAuth.callbackURL,
       passReqToCallback : true // allows us to pass in the req from our route (lets us check if a user is logged in or not)
    },
    function(req, token, refreshToken, profile, done) {

      var newUserMysql = {
        username: profile.displayName,
        Role_RoleID: 3,
        organization_organizationID: 1,
        google_id: profile.id,
        google_token: token,
        google_name: profile.displayName,
        google_email: profile.emails[0].value
      };

      connection.query("SELECT * FROM user WHERE google_id = ?",[profile.id],
        function(err, rows) {

          if (err)
              return done(err);

          if (!rows.length) {
            // adding the user to the DB if none is found:
            var insertQuery = "INSERT INTO user ( username, Role_RoleID, organization_organizationID ,google_id, google_token, google_name, google_email) values (?,?,?,?,?,?,?)";

            connection.query(insertQuery,[
              newUserMysql.username,
              newUserMysql.Role_RoleID,
              newUserMysql.organization_organizationID,
              newUserMysql.google_id,
              newUserMysql.google_token,
              newUserMysql.google_name,
              newUserMysql.google_email
            ], function(err, rows) {

                if (err)
                    return done(err);

                newUserMysql.userID = rows.insertId;

                return done(null, newUserMysql);
            });
          }

          // all is well, return successful user
          return done(null, rows[0]);
      });

    }));

};
