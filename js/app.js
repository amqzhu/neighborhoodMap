"use strict";

// save all the points of interest
var places = [
{
	name: 'Buckingham Palace',
	lat: 51.5014,
	lon: -0.1419
}, 
{
	name: 'Kensington Gardens',
	lat: 51.5070,
	lon: -0.1792
}, 
{
	name: 'The British Museum',
	lat: 51.5195, 
	lon: -0.1269
}, 
{
	name: 'Royal Albert Hall',
	lat: 51.5010, 
	lon: -0.1774 
}, 
{
	name: 'Piccadilly Circus',
	lat: 51.5096, 
	lon: -0.1346
},
{
	name: 'Westminster Abbey',
	lat: 51.4994, 
	lon: -0.1273
},
{
	name: 'Apollo Victoria Theatre',
	lat: 51.4956, 
	lon: -0.1427
},
{
	name: 'Sherlock Holmes Museum',
	lat: 51.5237, 
	lon: -0.1585
}];

// this is the data model, each data point has a name and latlong coordinates
var Place = function(data) {
	var self = this;
	self.name = data.name;
	self.lat = data.lat;
	self.lon = data.lon;
};

// this is the ViewModel
var PlacePageModel = function(data) {
	var self = this;
	this.placeList = ko.observableArray();

	data.forEach(function(aplace) {
		self.placeList.push(new Place(aplace));
	});

	// load wikipedia articles when user searches for a place
	this.loadData = function(place) {
		var $wikiElem = $('#wikipedia-links');

		// clear out old data before new request
		$wikiElem.text("");

		var poiStr=String(place.name);
		var wikiUrl = 'http://en.wikipedia.org/w/api.php?action=opensearch&search=' + poiStr + '&format=json&callback=wikiCallback';

		// error handling, will show text if articles fail to load
		var wikiRequestTimeout = setTimeout(function() {
			$wikiElem.text("failed to get wikipedia resources");
		}, 5000);

		// make ajax call to wikiURL and append results to DOM wiki element
		$.ajax({
			url: wikiUrl,
			dataType: "jsonp",
			success: function(response) {
				var articleList = response[1];
				for (var i = 0; i < articleList.length; i++) {
					var articleStr = articleList[i];
					var url = 'http://en.wikipedia.org/wiki/' + articleStr;
					$wikiElem.append('<li><a href="' + url + '">' + articleStr + '</a></li>');
				}
				clearTimeout(wikiRequestTimeout);
			}
		});
		return false;
	};

	// create filters for the place list
	var filters = [{
			Type: "text",
			Name: "Name",
			Value: ko.observable(""),
			RecordValue: function(record) { return record.name; }
		}];

	self.filter = new Filter(filters, this.placeList);
	self.pager = new PagerModel(self.filter.filteredRecords);
};

// model that represents the returned records from filtering
var PagerModel = function(records) {
	var self = this;
	self.records = new GetObservableArray(records);

	self.currentPageRecords = ko.computed(function() {
		var records = self.records();
		var places = {};
		records.forEach(function(p) {
			places[p.name] = true;
		});
		updateMarkers(places);
		return self.records();
	}).extend({ throttle: 5 });
};

// compare values of search and place names, and only return the matching ones as filtered
var Filter = function(filters, records) {
	var self = this;
	self.records = new GetObservableArray(records);
	self.filters = ko.observableArray(filters);
	// compare the name of each place to the user-input text string
	// if they match, mark the place as having passed the filter
	self.activeFilters = ko.computed(function() {
		var filters = self.filters();
		var activeFilters = [];
		var len = filters.length;
		for (var index = 0; index < len; index++) {
			var filter = filters[index];
			if (filter.Value) {
				var filterValue = filter.Value();
				if (filterValue && filterValue !== "") {
					var activeFilter = {
						Filter: filter,
						IsFiltered: function(filter, record) {
							var filterValue = filter.Value();
							filterValue = filterValue.toUpperCase();
							
							var recordValue = filter.RecordValue(record);
							recordValue = recordValue.toUpperCase();
							return recordValue.indexOf(filterValue) == -1;
						}
					};
					activeFilters.push(activeFilter);
				}
			}
		}
		return activeFilters;
	});
	// go through each record in the list, and get whether it was filtered from the previous step
	// if it is filtered, do not include in the new list that gets returned to the view 
	self.filteredRecords = ko.computed(function() {
		var records = self.records();
		var filters = self.activeFilters();
		var filteredRecords = [];
		var rlen = records.length;
		for (var rIndex = 0; rIndex < rlen; rIndex++) {
			var isIncluded = true;
			var record = records[rIndex];
			var flen = filters.length;
			for (var fIndex = 0; fIndex < flen; fIndex++) {
				var filter = filters[fIndex];
				var isFiltered = filter.IsFiltered(filter.Filter, record);
				if (isFiltered) {
					isIncluded = false;
					break;
				}
			}
			if (isIncluded) {
				filteredRecords.push(record);
			}
		}
		return filteredRecords;
	}).extend({ throttle: 200 });
};

// method to create ko.observableArray even if original input is not an array
var GetObservableArray = function(array) {
	if (typeof(array) == 'function');{
		return array;
	}
	return ko.observableArray(array);
};

// function to update markers given a set of names
// if name is true, then setMap. if name is not in the set, then delete marker off the map
var updateMarkers = function(nameSet) {
	if (markers == null) {
		return;
	}
	var plen = places.length;
	for (var i = 0; i < plen; i++) {
		if (nameSet[places[i].name]) {
			if (markers[i].map == null) {
				markers[i].setMap(map);
			}
		} else {
			markers[i].setMap(null);
		}
	}
};

// let knockout work its magic
ko.applyBindings(new PlacePageModel(places));

// This initializes the Google Maps section, and puts markers for all the places
var map;
var markers = [];
var initialize = function() {
	var mapCanvas = document.getElementById('map-canvas');
	// coordinates of central London
	var myLatLng = new google.maps.LatLng(51.5112, -0.1478);
	var mapOptions = {
		center: myLatLng,
		zoom: 13,
		mapTypeId: google.maps.MapTypeId.ROADMAP
	};
	map = new google.maps.Map(mapCanvas,mapOptions);

	var infowindow = new google.maps.InfoWindow({
		content: ''
	});

	// place a marker on each point of interest
	var plen = places.length;
	for (var i = 0; i < plen; i ++) {
		markers[i] = new google.maps.Marker({
			position: new google.maps.LatLng(places[i].lat, places[i].lon),
			map: map,
			title: places[i].name
		});
		// add functionality to distinguish clicked vs unclicked markers
		google.maps.event.addListener(markers[i], 'click',(function(markerCopy) {
			return function() {
				infowindow.setContent(markerCopy.title);
				infowindow.open(map,markerCopy);
				};
			})(markers[i]));
	}
};

// in case google maps fails to load, user will see error message
try {
	google.maps.event.addDomListener(window, 'load', initialize);
} catch(err) {
	document.getElementById("map-canvas").innerHTML = 'Sorry, cannot load map';
}

// make the list of places and list of wikipedia articles collapsible
// so it's easier to view on mobile devices
$('#allPlaces').collapsible('default-open');
$('#allWikis').collapsible('default-open');