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

    me.userData = [];
    me.patientData = [];
    me.medicineData = [];
    me.noteData = [];
    me.testSessionData = [];
    me.therapyData = [];
    me.therapyListData = [];

    me.init();

  },

  init() {
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

          var medicines = result.Medicine.medicineID;

          for (var i = 0; i < medicines.length; i++) {
            me.medicineData.push({'name': medicines[0].name});
          }

          me.getTestSessionData();
        });
      });
  },

  /**
   * This function assumes that ALL testsessions are accessible by the user with userid 1
   * This is a hack, normally I would need to use the userid from the current user session.
   */
  getTestSessionData() {
    console.log('getTestSessionData');

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
    console.log('parseCSVDatasets');

    async.map(datasets, function (dataset, callback) {

      parse(dataset.body, {
          delimiter: ',',
          newline: '\r'
        },
        function(error, output) {

          var resultObj = {};

          if (!error) {

            for(var i = 0; i < output.length; i++) {

              if(i === 0 && output[i] !== 'ID') {
                  output[i].unshift('ID');
              } else {
                  output[i].unshift('');

                for (var j = 1; j < output[i].length; j++) {
                  output[i][j] = Number(output[i][j]);
                }
              }
            }

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

        for (var i = 0; i < results.length; i++) {
          me.testSessionData[i].csvData = results[i].body;
        }

        me.getNoteData();
      }
    });
  },

  getNoteData() {
    request("http://4me302-16.site88.net/getData.php?table=Note",
      function(error, response, data) {
        parseString(data, function (err, result) {

          var notes = result.Note.noteID;

          for (var i = 0; i < notes.length; i++) {
            me.noteData.push({
              'testSessionID': notes[0].Test_Session_IDtest_session,
              'userID': notes[0].User_IDmed,
              'note': notes[0].note
            });
          }
console.log(me.noteData);
          me.assemblePatientData();
        });
      });
  },

  /**
  * Check if this testsession has notes and append them if there are any
  */
  appendNotes(testSession) {

    testSession.notes = [];

    for (var i = 0; i < me.noteData.length; i++) {

      if (parseInt(me.noteData[i].testSessionID) === parseInt(testSession.id)) {
        testSession.notes.push(me.noteData[i]);
      }
    }
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

      me.appendNotes(me.testSessionData[i]);

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

  render() {
    console.log('render');

    me.res.render(me.page, {
      message: me.req.flash('patient overview'),
      user : me.req.user,
      patientData: me.patientData
    });
  }
};
