var request = require("request");
var parseString = require('xml2js').parseString;
var util = require('util');

var me = module.exports = {

  renderPage(page, req, res) {
    me.page = page;
    me.req = req;
    me.res = res;

    me.userID = 1;
    me.patientID = 3;

    me.userData = [];
    me.patientData = [];
    me.medicineData = [];
    me.therapyData = [];
    me.therapyListData = [];
    me.testSessions = [];

    me.init();

  },

  init() {
    // me.setUserID(me.req.user.username);
    me.getUserData();
  },

  getUserData() {
    request("http://4me302-16.site88.net/getData.php?table=User",
      function(error, response, data) {
        parseString(data, function (err, result) {
          for (var i = 0; i < result.User.userID.length; i++) {
            me.userData.push({
              'id': result.User.userID[i].$.id,
              'username': result.User.userID[i].username
            });
          }
          me.getTherapyData();
        });
    });
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
          me.getTestSessionData(0);
        });
      });
  },

  getTestSessionData() {

    request('http://4me302-16.site88.net/getFilterData.php?parameter=User_IDpatient&value=' + me.patientID,
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

            therapyID = me.therapyData[me.testSessions[i].therapyID-1].TherapyList_IDtherapylist;

            me.testSessions[i].therapyName = me.therapyListData[therapyID-1].name;
            me.testSessions[i].dosage = me.therapyListData[therapyID-1].Dosage;

            medicineID = me.therapyListData[therapyID-1].Medicine_IDmedicine;
            me.testSessions[i].medicineName = me.medicineData[medicineID-1].name;

            me.testSessions[i].dataURL = 'http://4me302-16.site88.net/'+ me.testSessions[i].DataURL + '.csv'
          }

          me.patientData.push({
            username: me.getUsername(),
            therapyData: me.testSessions
          });

          me.getPatientData();
        });
      });
  },

  getUsername() {

    for (var i = 0; i < me.userData.length; i++) {

      if (parseInt(me.userData[i].id) === me.patientID) {
        return me.userData[i].username[0];
      }
    }
  },

  getPatientData() {

    request('http://4me302-16.site88.net/getFilterData.php?parameter=User_IDmed&value=' + me.userID,
      function(error, response, data) {
        parseString(data, function (err, result) {

          if (!me.counter) {
            me.counter = 0;
          }

          if (me.counter === result.EData.test_sessionID.length) {
            console.log(me.patientData);
            me.render();
            return;
          }

          var currPatientID;
          for (me.counter; me.counter < result.EData.test_sessionID.length; me.counter++) {

            currentPatientID = parseInt(result.EData.test_sessionID[me.counter].User_IDpatient[0]);

            if (me.patientID !== currentPatientID) {

              // updating patientID if this session was done by another patient than previous session
              me.patientID = currentPatientID;
              me.getTestSessionData();
            }
          }
        });
      });
  },

  /*
  * Helper to map users from our db to api users
  */
  setUserID(username) {
    if (username === 'doc') {
      me.userID = 1;
    } if (username === 'researcher') {
      me.userID = 2;
    }
  },

  render() {
    me.res.render(me.page, {
      message: me.req.flash('patient overview'),
      user : me.req.user,
      patientData: me.patientData
    });
  }
};
