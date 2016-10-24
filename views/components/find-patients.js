// Src: https://developers.google.com/maps/documentation/javascript/examples/infowindow-simple?hl=de
// Src: http://stackoverflow.com/questions/3059044/google-maps-js-api-v3-simple-multiple-marker-example

  function initMap() {

  var patientsMapData = getPatientsMapData(<%- JSON.stringify(users) %>);
  console.log(patientsMapData);

  var map = new google.maps.Map(document.getElementById('map'), {
    zoom: 6,
    center: new google.maps.LatLng(patientsMapData[0].lat, patientsMapData[0].lng)
  });

  var infowindow = new google.maps.InfoWindow();
  var marker;

  for (var i = 0; i < patientsMapData.length; i++) {
    marker = new google.maps.Marker({
      position: new google.maps.LatLng(patientsMapData[i].lat, patientsMapData[i].lng),
      map: map
    });

    google.maps.event.addListener(marker, 'click', (function(marker, i) {
      return function() {
        infowindow.setContent(patientsMapData[i].markerContent);
        infowindow.open(map, marker);
      }
    })(marker, i));
  }
}

function getPatientsMapData(users) {

  var patientsMapData = [];

  for (var i = 0; i < users.length; i++) {

    if (users[i].Lat[0] && users[i].Lat[0].length > 0
        && users[i].Long[0] && users[i].Long[0].length > 0) {

      var markerContent = '<p><b>Username:</b> ' + users[i].username[0] +'</p>' +
          '<p><b>Email:</b> ' + users[i].email[0] +'</p>' +
          '<p><b>Organization:</b> ' + users[i].Organization[0] +'</p>';

      patientsMapData.push({
        markerContent: markerContent,
        lat: parseFloat(users[i].Lat[0]),
        lng: parseFloat(users[i].Long[0])
      });
    }
  }

  return patientsMapData;
}
