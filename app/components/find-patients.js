var request = require("request");
var parseString = require('xml2js').parseString;
var async = require("async");

var me = module.exports = {

  articles: [],
  users: [],

  renderPage(page, req, res) {
    me.page = page;
    me.req = req;
    me.res = res;
    me.getRSSFeed();
  },

  getRSSFeed() {
    request("http://www.news-medical.net/tag/feed/Parkinsons-Disease.aspx",
      function(error, response, data) {

        parseString(data, function (err, result) {
          me.articles = result.rss.channel;
          me.getUsers();
        });
      });
  },
  getUsers() {
    request("http://4me302-16.site88.net/getData.php?table=User",
      function(error, response, data) {
        parseString(data, function (err, result) {
          me.users = result.User.userID;
          me.render();
        });
      });

  },

  render() {
    me.res.render(me.page, {
      message: me.req.flash('patient overview'),
      user : me.req.user,
      users: me.users,
      articles: me.articles
    });
  }
};
