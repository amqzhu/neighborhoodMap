// this is the data model, each data point has a name and latlong coordinates
var Place = function(data) {
	var self = this;
	self.name = data.name;
	self.latLang = data.latLang;
};

// this is the ViewModel
function PlacePageModel(data) {
	var self = this;
	this.placeList = ko.observableArray([]);

	places.forEach(function(aplace) {
		self.placeList.push(new Place(aplace));
	});
	this.currentPlace = ko.observable('');
	
	this.setPlace = function(chosenPlace) {
		self.currentPlace(chosenPlace);
	};
	
	// load wikipedia articles when user searches for a place
	this.loadData = function(place) {
		var $wikiElem = $('#wikipedia-links');
		var $greeting = $('#greeting');

		// clear out old data before new request
		$wikiElem.text("");

		var poiStr=String(place.name);

		var wikiUrl = 'http://en.wikipedia.org/w/api.php?action=opensearch&search=' + poiStr + '&format=json&callback=wikiCallback';

		var wikiRequestTimeout = setTimeout(function() {
		$wikiElem.text("failed to get wikipedia resources");
		}, 5000);

		$.ajax({
			url: wikiUrl,
			dataType: "jsonp",
			success: function(response) {
				var articleList = response[1];
				for (var i = 0; i < articleList.length; i++) {
					articleStr = articleList[i];
					var url = 'http://en.wikipedia.org/wiki/' + articleStr;
					$wikiElem.append('<li><a href="' + url + '">' + articleStr + '</a></li>');
				};
				clearTimeout(wikiRequestTimeout);
			}
		});
		return false;
	};
	// create filter for the place list
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
function PagerModel(records) {
	var self = this;
	self.records = GetObservableArray(records);

	self.currentPageRecords = ko.computed(function() {
		return self.records();
	}).extend({ throttle: 5 });
};

// 
function Filter(filters, records) {
	var self = this;
	self.records = GetObservableArray(records);
	self.filters = ko.observableArray(filters);
	self.activeFilters = ko.computed(function() {
		var filters = self.filters();
		var activeFilters = [];
		for (var index = 0; index < filters.length; index++) {
			var filter = filters[index];
			if (filter.Value) {
				var filterValue = filter.Value();
				if (filterValue && filterValue != "") {
					var activeFilter = {
						Filter: filter,
						IsFiltered: function(filter, record) {
							var filterValue = filter.Value();
							filterValue = filterValue.toUpperCase();
							
							var recordValue = filter.RecordValue(record);
							recordValue = recordValue.toUpperCase();
							return recordValue.indexOf(filterValue) == -1;
						};
					};
					activeFilters.push(activeFilter);
				};
			};
		};
		return activeFilters;
	});
	self.filteredRecords = ko.computed(function() {
		var records = self.records();
		var filters = self.activeFilters();
		if (filters.length == 0) {
			return records;
		};
		
		var filteredRecords = [];
		for (var rIndex = 0; rIndex < records.length; rIndex++) {
			var isIncluded = true;
			var record = records[rIndex];
			for (var fIndex = 0; fIndex < filters.length; fIndex++) {
				var filter = filters[fIndex];
				var isFiltered = filter.IsFiltered(filter.Filter, record);
				if (isFiltered) {
					isIncluded = false;
					break;
				};
			};
			if (isIncluded) {
				filteredRecords.push(record);
			};
		};
		return filteredRecords;
	}).extend({ throttle: 200 });
};


function GetObservableArray(array) {
	if (typeof(array) == 'function');{
		return array;
	};
	return ko.observableArray(array);
};

// save all the points of interest in an array
var places = [
{
	name: 'Buckingham Palace',
	latLang: new google.maps.LatLng(51.5014, -0.1419)
}, 
{
	name: 'Kensington Gardens',
	latLang: new google.maps.LatLng(51.5070, -0.1792)
}, 
{
	name: 'The British Museum',
	latLang: new google.maps.LatLng(51.5192, -0.1243)
}, 
{
	name: 'Royal Albert Hall',
	latLang: new google.maps.LatLng(51.4941, -0.1739)
}, 
{
	name: 'Piccadilly Circus',
	latLang: new google.maps.LatLng(51.5096, -0.1346)
}];

ko.applyBindings(new PlacePageModel(places));

// This initializes the Google Maps section, and puts markers for all the places
initialize = function() {
	var mapCanvas = document.getElementById('map-canvas');
	// coordinates of central London
	var myLatLng = new google.maps.LatLng(51.5067, -0.1428);
	var mapOptions = {
		center: myLatLng,
		zoom: 13,
		mapTypeId: google.maps.MapTypeId.ROADMAP
	};
	var map = new google.maps.Map(mapCanvas,mapOptions);

	var contentString = 'You clicked this!';
	var infowindow = new google.maps.InfoWindow({
		content: contentString
	});

	// place a marker on each point of interest
	var numPlaces = places.length;
	for (i = 0; i < numPlaces; i ++) {
		var marker = new google.maps.Marker({
			position: places[i].latLang,
			map: map,
			title: places[i].name
		});
		// add functionality to distinguish clicked vs unclicked markers
		google.maps.event.addListener(marker, 'click',(function(markerCopy) {
			return function() {
				infowindow.open(map,markerCopy);
				};
			})(marker));
	};
};

google.maps.event.addDomListener(window, 'load', initialize);