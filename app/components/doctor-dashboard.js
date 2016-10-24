var request = require("request");
var async = require("async");
var requestRetry = require('requestretry');

var parseString = require('xml2js').parseString;
var parse = require('csv-parse');
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
    me.testSessionData = [];
    me.therapyData = [];
    me.therapyListData = [];
    me.testSessions = [];
me.csvDatasets = [];
    me.counter = me.csvCounter = 0;

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

          me.getTestSessionData2();
        });
      });
  },

  /**
   * This function assumes that ALL testsessions are accessible by the user with userid 1
   */
  getTestSessionData2() {
    console.log('getTestSessionData2');

    request('http://4me302-16.site88.net/getFilterData.php?parameter=User_IDmed&value=1',
      function(error, response, data) {
        parseString(data, function (err, result) {

          var testSessions = result.EData.test_sessionID,
              medicineID,
              therapyID;

          for (var i = 0; i < testSessions.length; i ++) {

            therapyID = me.therapyData[testSessions[i].therapyID-1].TherapyList_IDtherapylist;
            medicineID = me.therapyListData[therapyID-1].Medicine_IDmedicine;

            me.testSessionData.push({
              'id': testSessions[i].$.id,
              'patientID': parseInt(testSessions[i].User_IDpatient[0]),
              'datetime': testSessions[i].test_datetime[0],
              'therapyName': me.therapyListData[therapyID-1].name[0],
              'dosage': me.therapyListData[therapyID-1].Dosage[0],
              'medicineName': me.medicineData[medicineID-1].name[0],
              'dataURL': 'http://4me302-16.site88.net/'+ testSessions[i].DataURL + '.csv'
            });
          }
          me.getCSVData();
        });
      });
  },

  getCSVData() {
    console.log('getCSVData');

    var lookupList = [];

    for (var i = 0; i < me.testSessionData.length; i++) {
      lookupList.push({
        testSessionID: me.testSessionData[i].id,
        dataURL: me.testSessionData[i].dataURL
      });
    }

    async.map(lookupList, function (item, callback) {
      requestRetry({
          url: item.dataURL,
          maxAttempts: 20,
          retryDelay: 20,
          retryStrategy: requestRetry.RetryStrategies.HTTPOrNetworkError
        },
        function (error, response, body) {

          var resultObj = {};

          if (!error && response.statusCode === 200) {
            resultObj.body = body;
            resultObj.testSessionID = item.testSessionID;
            callback(null, resultObj);
          } else {
            console.log(error);
            callback(error || response.statusCode);
          }
        });
    },
    // this gets called after all requests are finished
    function (error, results) {

      if (!error) {
        me.parseCSVDatasets(results);
      }
    });
  },

  parseCSVDatasets(datasets) {
    console.log('parseCSVDatasets', datasets.length);

    async.map(datasets, function (dataset, callback) {

      parse(dataset.body, {
          delimiter: ',',
          newline: '\r'
        },
        function(error, output) {

          var resultObj = {};

          if (!error) {
            resultObj.body = output;
            resultObj.testSessionID = dataset.testSessionID;
            callback(null, resultObj);
          } else {
            console.log(error);
            callback(error || response.statusCode);
          }
      });
    },
    // this gets called after all requests are finished
    function (error, results) {

      if (!error) {
        console.log('parseCSVDatasets results',results.length, results[0].testSessionID);

        for (var i = 0; i < results.length; i++) {
          me.testSessionData[i].csvData = results[i].body;
        }
console.log('me.testSessions ---', me.testSessionData.length, me.testSessionData);
        me.assemblePatientData();
      }
    });
  },

  /**
   * This function takes all the data that was collected through previous requests
   * and "assembles" complete patient data objects, by creating one object for each
   * patient that contains the patient name and his testsessions... ;)
   */
  assemblePatientData() {

    var currentPatientID = me.testSessionData[0].patientID;

    me.patientData.push({
      username: me.getUsername(currentPatientID),
      testSessions: []
    });

    for (var i = 0; i < me.testSessionData.length; i++) {

      if (me.testSessionData[i].patientID !== currentPatientID) {

        currentPatientID = parseInt(me.testSessionData[i].patientID);

        me.patientData.push({
          username: me.getUsername(currentPatientID),
          testSessions: [me.testSessionData[i]]
        });

      } else {

          me.patientData[me.patientData.length - 1].testSessions.push(me.testSessionData[i]);
      }
    }

    me.render();
  },

  getUsername(patientID) {

    for (var i = 0; i < me.userData.length; i++) {

      if (parseInt(me.userData[i].id) === patientID) {
        return me.userData[i].username[0];
      }
    }
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
    console.log('render');

    me.res.render(me.page, {
      message: me.req.flash('patient overview'),
      user : me.req.user,
      patientData: me.patientData
    });
  }
};
