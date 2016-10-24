var request = require("request");
var parseString = require('xml2js').parseString;
var async = require("async");
var fs = require('fs');
var parse = require('csv-parse');

module.exports = {

  renderPage(page, req, res) {

    var parser = parse({delimiter: ','}, function(err, data) {

      var csvData = data;
      var patientDataArr = [];
      var lookupList = [
        'http://4me302-16.site88.net/getData.php?table=User',
        'http://4me302-16.site88.net/getData.php?table=Therapy',
        'http://4me302-16.site88.net/getData.php?table=Therapy_List',
        'http://4me302-16.site88.net/getData.php?table=Test',
        'http://4me302-16.site88.net/getData.php?table=Test_Session',
        'http://4me302-16.site88.net/getData.php?table=Note',
        'http://4me302-16.site88.net/getData.php?table=Medicine'
      ];

      // solution from: http://stackoverflow.com/questions/32442426/solution-found-node-js-async-parallel-requests-are-running-sequentially
      async.map(lookupList, function(url, callback) {

          // iterator function
          request(url, function (error, response, body) {

              if (!error && response.statusCode == 200) {

                  // do any further processing of the data here
                  callback(null, body);
              } else {
                  callback(error || response.statusCode);
              }
          });
      }, function(err, results) {

          if (err)
            return false;

          // process all results in the array here
          for (var i = 0; i < results.length; i++) {
            parseString(results[i], function (err, result) {
              patientDataArr.push(result);
            });
          }

          res.render(page, {
            message: req.flash('manage-patients'),
            user : req.user,
            csvData: csvData,
            patientDataArr: patientDataArr
          });
      });

    });

    fs.createReadStream('data/data1.csv').pipe(parser);
  },

  appendTestData(data) {

    var dataURL;
//     var parser = parse({delimiter: ','}, function(err, data) {
//       console.log(data);
//     });
// fs.createReadStream('data/data1.csv').pipe(parser);



    // for(var i = 0; i < data.length; i ++) {

       dataURL = 'http://4me302-16.site88.net/'+ data[0].DataURL + '.csv';
      request(dataURL, function(error, response, data) {
// console.log(response);
        var output = [];
        // Create the parser
        var parser = parse({delimiter: ':'});
        // Use the writable stream api
        parser.on('readable', function(){
          while(record = parser.read()){
            output.push(record);
          }
        });
        // Catch any error
        parser.on('error', function(err){
          console.log(err.message);
        });
        // When we are done, test that the parsed output matched what expected
        parser.on('finish', function(){
          console.log(output);
        });
        // Now that setup is done, write data to the stream
        parser.write(response);
        // Close the readable stream
        parser.end();

          var records = parse(response, {delimiter: ',',columns: true, newline: '\r'});
        // console.log(response);
        console.log('-----------------------------------------');
      });
    // }
  }
};
