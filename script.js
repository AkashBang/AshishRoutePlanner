let map, directionsService, directionsRenderer;
let autocomplete1, autocomplete2, autocomplete3;
let geocoder;

function initMap() {
  map = new google.maps.Map(document.getElementById('map'), {
    center: { lat: 37.77, lng: -122.41 },
    zoom: 12
  });

  directionsService = new google.maps.DirectionsService();
  directionsRenderer = new google.maps.DirectionsRenderer();
  directionsRenderer.setMap(map);
  geocoder = new google.maps.Geocoder();

  autocomplete1 = new google.maps.places.Autocomplete(document.getElementById('stop-1'));
  autocomplete2 = new google.maps.places.Autocomplete(document.getElementById('stop-2'));
  autocomplete3 = new google.maps.places.Autocomplete(document.getElementById('stop-3'));

  document.getElementById('calculate-route').addEventListener('click', calculateAndDisplayRoute);
}

function calculateAndDisplayRoute() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(position => {
      const userLocation = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
      map.setCenter(userLocation);

      const stop1 = autocomplete1.getPlace();
      const stop2 = autocomplete2.getPlace();
      const stop3 = autocomplete3.getPlace();
      if (!stop1 || !stop2 || !stop3) {
        alert('Please select all stops from the dropdown list.');
        return;
      }

      calculateRouteFromCurrentLocation(userLocation, [stop1, stop2, stop3]);
    }, () => {
      handleLocationError(true, map.getCenter());
    });
  } else {
    handleLocationError(false, map.getCenter());
  }
}

function calculateRouteFromCurrentLocation(userLocation, stops) {
  let shortestDuration = Infinity;
  let bestRoute = null;

  const processPermutation = (permutation) => {
    const waypoints = permutation.map(stop => {
      return { location: stop.formatted_address, stopover: true };
    });

    directionsService.route({
      origin: userLocation,
      destination: waypoints[waypoints.length - 1].location,
      waypoints: waypoints.slice(0, -1),
      travelMode: google.maps.TravelMode.DRIVING,
      optimizeWaypoints: true
    }, (response, status) => {
      if (status === 'OK') {
        const duration = response.routes[0].legs.reduce((total, leg) => total + leg.duration.value, 0);
        if (duration < shortestDuration) {
          shortestDuration = duration;
          bestRoute = response;
        }
      }
      // If all permutations have been processed, display the best route
      if (permutationIndex >= permutations.length - 1) {
        if (bestRoute) {
          directionsRenderer.setDirections(bestRoute);
          displayRouteDetails(bestRoute);
        }
      }
      permutationIndex++;
    });
  };

  let permutations = permute(stops.map((stop, index) => index)); // Permute indices
  let permutationIndex = 0;
  permutations.forEach(permutationIndices => {
    processPermutation(permutationIndices.map(index => stops[index]));
  });
}

function permute(inputArr) {
  let result = [];
  const permuteArr = (arr, m = []) => {
    if (arr.length === 0) {
      result.push(m);
    } else {
      for (let i = 0; i < arr.length; i++) {
        let curr = arr.slice();
        let next = curr.splice(i, 1);
        permuteArr(curr.slice(), m.concat(next));
     }
   }
 }
 permuteArr(inputArr);
 return result;
}

function displayRouteDetails(routeResponse) {
  const route = routeResponse.routes[0];
  const routeDetailsElement = document.getElementById('route-details');
  routeDetailsElement.innerHTML = '';

  const ul = document.createElement('ol');
  ul.className = 'route-list';

  route.legs.forEach((leg, index) => {
    const li = document.createElement('li');
    li.textContent = `${index + 1}. ${leg.start_address} - ${leg.end_address} (${leg.duration.text})`;
    ul.appendChild(li);
  });

  routeDetailsElement.appendChild(ul);
}

function handleLocationError(browserHasGeolocation, pos) {
  alert(browserHasGeolocation ?
    'Error: The Geolocation service failed.' :
    'Error: Your browser doesn\'t support geolocation.');
  map.setCenter(pos);
}