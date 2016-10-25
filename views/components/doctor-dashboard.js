google.charts.load("current", {packages:["corechart"]});
// google.charts.setOnLoadCallback(drawChart);

var patientData = <%- JSON.stringify(patientData) %>;

for (var i in patientData) {
  for(var j in patientData[i].testSessions) {
    $('.js-showData-' + i + '-' + j).on('click', function(e) {
      var indexI = e.currentTarget.className.split('-')[2];
      var indexJ = e.currentTarget.className.split('-')[3];
      var csvData = patientData[indexI].testSessions[indexJ].csvData;

      var notes = patientData[indexI].testSessions[indexJ].notes;
      var notesHtml = '';

      for (var i = 0; i < notes.length; i++) {
        notesHtml += '<li>';
        notesHtml += '<p>' + notes[i].note + '</p>';
        notesHtml += '<small>by: ' + notes[i].userID + '</small>';
        notesHtml += '</li>';
      }

      $('.js-notelist').html(notesHtml);

      drawChart(csvData);
      $('html, body').animate({ scrollTop: 0 }, 'fast');
    });
  }
}

function drawChart(csvData) {

  data = google.visualization.arrayToDataTable(csvData);

  var options = {
    colorAxis: {colors: ['#9ae2ff', 'teal']},
    hAxis: {title: 'y'},
    vAxis: {title: 'x'},
    animation: {
      startup: true
    },
    bubble: {
      stroke: 'transparent'
    },
    sizeAxis: {
      minSize: 1,
      maxSize: 4
    }
  };

  var chart = new google.visualization.BubbleChart(document.getElementById('chart_div'));
  chart.draw(data, options);
  flag = false;
}
