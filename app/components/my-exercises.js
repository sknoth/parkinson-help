var request = require("request");
var parseString = require('xml2js').parseString;
var async = require("async");
var fs = require('fs');
var parse = require('csv-parse');

var me = module.exports = {

  medicineData: [],
  therapyData: [],
  therapyListData: [],
  testSessions: [],
  userID: 0,
  page: '',
  req: '',
  res: '',

  // make all neccessary requests
  init() {
    me.getTherapyData();
  },

  getTherapyData() {
    request("http://4me302-16.site88.net/getData.php?table=Therapy",
      function(error, response, data) {
        parseString(data, function (err, result) {
          for (var i = 0; i < result.Therapy.therapyID.length; i++) {
            me.therapyData.push({
              'TherapyList_IDtherapylist': result.Therapy.therapyID[i].TherapyList_IDtherapylist
            });
          }
          console.log(me.therapyData);
          me.getTherapyListData();
        });
    });
  },

  getTherapyListData() {
    request("http://4me302-16.site88.net/getData.php?table=Therapy_List",
      function(error, response, data) {
        parseString(data, function (err, result) {
          for (var i = 0; i < result.Therapy_List.therapy_listID.length; i++) {
            me.therapyListData.push({
              'name': result.Therapy_List.therapy_listID[0].name,
              'Dosage': result.Therapy_List.therapy_listID[0].Dosage,
              'Medicine_IDmedicine': result.Therapy_List.therapy_listID[0].Medicine_IDmedicine
            });
          }
          me.getMedicineData();
        });
    });
  },

  getMedicineData() {
    request("http://4me302-16.site88.net/getData.php?table=Medicine",
      function(error, response, data) {
        parseString(data, function (err, result) {
          for (var i = 0; i < result.Medicine.medicineID.length; i++) {
            me.medicineData.push({'name': result.Medicine.medicineID[0].name});
          }
          me.getTestSessionData();
        });
      });
  },

  getTestSessionData() {
    request('http://4me302-16.site88.net/getFilterData.php?parameter=User_IDpatient&value=' + me.userID,
      function(error, response, data) {
        parseString(data, function (err, result) {

          me.testSessions = result.EData.test_sessionID;

          if(!me.testSessions) {
            me.render();
            return;
          }

          var medicineID,
              therapyID;

          for (var i = 0; i < me.testSessions.length; i ++) {
            console.log('testSessions', me.therapyListData, me.testSessions[i].therapyID);

            therapyID = me.therapyData[me.testSessions[i].therapyID-1].TherapyList_IDtherapylist;
            
            me.testSessions[i].therapyName = me.therapyListData[therapyID-1].name;
            me.testSessions[i].dosage = me.therapyListData[therapyID-1].Dosage;

            medicineID = me.therapyListData[therapyID-1].Medicine_IDmedicine;
            me.testSessions[i].medicineName = me.medicineData[medicineID-1].name;

            me.testSessions[i].dataURL = 'http://4me302-16.site88.net/'+ me.testSessions[i].DataURL + '.csv'
          }

          me.render();
        });
      });
  },

  renderPage(page, req, res) {
    me.page = page;
    me.req = req;
    me.res = res;

    if(!req.user) {
      me.render();
      return;
    }

    me.setUserID(req.user.username);

    me.init();
  },

  /*
  * Helper to map users from our db to api users
  */
  setUserID(username) {
    if (username === 'patient1') {
      me.userID = 3;
    } if (username === 'patient2') {
      me.userID = 4;
    }
  },

  render() {
    me.res.render(me.page, {
      message: me.req.flash('manage-patients'),
      user : me.req.user,
      testSessions: me.testSessions
    });
  }
}
