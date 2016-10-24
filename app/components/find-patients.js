var request = require("request");
var parseString = require('xml2js').parseString;
var async = require("async");

module.exports = {

  renderPage(page, req, res) {

    request("http://4me302-16.site88.net/getData.php?table=User",
      function(error, response, data) {
        parseString(data, function (err, result) {
            res.render(page, {
              message: req.flash('patient overview'),
              user : req.user,
              users: result.User.userID
            });
        });
      });


  }
};
