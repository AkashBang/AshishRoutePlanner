let map, directionsService, directionsRenderer;
let autocomplete1, autocomplete2, autocomplete3;
let geocoder;

const autocompleteInstances = new Map();



function initMap() {
  map = new google.maps.Map(document.getElementById('map'), {
    center: { lat: 37.77, lng: -122.41 },
    zoom: 12
  });

  // Ask for the user's current location
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(position => {
      const userLocation = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
      map.setCenter(userLocation);
    }, () => {
      handleLocationError(true, map.getCenter());
    });
  } else {
    handleLocationError(false, map.getCenter());
  }

  directionsService = new google.maps.DirectionsService();
  directionsRenderer = new google.maps.DirectionsRenderer();
  directionsRenderer.setMap(map);
  geocoder = new google.maps.Geocoder();
  document.getElementById('add-stop').addEventListener('click', function() {
  const newInput = document.createElement('input');
  newInput.type = 'text';
  newInput.placeholder = 'Enter stop';
  document.getElementById('route-inputs').appendChild(newInput);
  // Store the Autocomplete instance in the Map
  autocompleteInstances.set(newInput, new google.maps.places.Autocomplete(newInput));
});

  document.getElementById('calculate-route').addEventListener('click', calculateAndDisplayRoute);
}

function calculateAndDisplayRoute() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(position => {
      const userLocation = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
      map.setCenter(userLocation);
      const stops = Array.from(document.getElementById('route-inputs').getElementsByTagName('input')).map(input => {
        const autocomplete = autocompleteInstances.get(input);
        return autocomplete ? autocomplete.getPlace() : null;
      });
      console.log(stops)
      if (stops.some(stop => !stop)) {
        alert('Please select all stops from the dropdown list.');
        return;
      }

      calculateRouteFromCurrentLocation(userLocation, stops);
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

  const routeDetailsTitle = document.createElement('h2');
  routeDetailsTitle.textContent = 'Route Details';
  routeDetailsElement.appendChild(routeDetailsTitle);

  // Calculate total duration
  let totalDurationSeconds = 0;
  route.legs.forEach(leg => {
    totalDurationSeconds += leg.duration.value;
  });
  const totalDurationMinutes = Math.floor(totalDurationSeconds / 60);
  const totalDurationHours = Math.floor(totalDurationMinutes / 60);
  const remainingMinutes = totalDurationMinutes % 60;

  // Display total duration
  const totalDurationElement = document.createElement('p');
totalDurationElement.className = 'total-duration';
totalDurationElement.textContent = `Total duration: ${totalDurationHours} hours ${remainingMinutes} minutes`;
routeDetailsElement.appendChild(totalDurationElement);

  // Display route details
  const ul = document.createElement('ol');
  ul.className = 'route-list';
  const colors = ['#ffadad', '#ffd6a5', '#fdffb6', '#caffbf', '#9bf6ff', '#a0c4ff', '#bdb2ff', '#ffc6ff'];
  const addressColors = new Map();
  let colorCounter = 0;
  
  const promises = route.legs.map((leg, index) => {
    return new Promise((resolve, reject) => {
      const li = document.createElement('li');
      geocoder.geocode({ 'address': leg.start_address }, function(results, status) {
        if (status == 'OK') {
          const shortStartAddress = results[0].formatted_address;
          let startColor = addressColors.get(shortStartAddress);
          if (!startColor) {
            startColor = colors[colorCounter % colors.length];
            addressColors.set(shortStartAddress, startColor);
            colorCounter++;
          }
  
          geocoder.geocode({ 'address': leg.end_address }, function(results, status) {
            if (status == 'OK') {
              const shortEndAddress = results[0].formatted_address;
              let endColor = addressColors.get(shortEndAddress);
              if (!endColor) {
                endColor = colors[colorCounter % colors.length];
                addressColors.set(shortEndAddress, endColor);
                colorCounter++;
              }
  
              li.innerHTML = `<span class="address-chip" style="background-color: ${startColor}">${shortStartAddress}</span> - <span class="address-chip" style="background-color: ${endColor}">${shortEndAddress}</span> (${leg.duration.text})`;
              if (index === 0) {
                li.className = 'start-point';
                li.innerHTML = `<span class="address-chip" style="background-color: ${startColor}">${shortStartAddress}</span> - <span class="address-chip" style="background-color: ${endColor}">${shortEndAddress}</span> (${leg.duration.text})`;
              } else if (index === route.legs.length - 1) {
                li.className = 'end-point';
                li.innerHTML = `<span class="address-chip" style="background-color: ${startColor}">${shortStartAddress}</span> - <span class="address-chip" style="background-color: ${endColor}">${shortEndAddress}</span> (${leg.duration.text})`;
              }
              resolve(li);
            } else {
              reject('Geocode was not successful for the following reason: ' + status);
            }
          });
        } else {
          reject('Geocode was not successful for the following reason: ' + status);
        }
      });
    });
  });
  
  Promise.all(promises).then(listItems => {
    listItems.forEach(li => ul.appendChild(li));
    routeDetailsElement.appendChild(ul);
  }).catch(error => {
    console.log(error);
  });
  routeDetailsElement.appendChild(ul);
  const clearRouteDetailsButton = document.createElement('button');
clearRouteDetailsButton.textContent = 'Clear Route Details';
clearRouteDetailsButton.addEventListener('click', function() {
  routeDetailsElement.innerHTML = '';
});
routeDetailsElement.appendChild(clearRouteDetailsButton);
}

function handleLocationError(browserHasGeolocation, pos) {
  alert(browserHasGeolocation ?
    'Error: The Geolocation service failed.' :
    'Error: Your browser doesn\'t support geolocation.');
  map.setCenter(pos);
}