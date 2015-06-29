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

// this is the model
var Place = function(data) {
	this.name = ko.observable(data.name);
	this.latLang = ko.observable(data.latLang);
};


var ViewModel = function() {
	var self = this;
	this.placeList = ko.observableArray([]);

	places.forEach(function(aplace){
		self.placeList.push(new Place(aplace));
	});

	//this.currentPlace = ko.observable(this.placeList()[0]);
	this.currentPlace = ko.observable('London');

	this.setPlace = function(chosenPlace) {
		self.currentPlace(chosenPlace);
	};
	
	this.loadData = function() {
		var $wikiElem = $('#wikipedia-links');
		var $greeting = $('#greeting');

		// clear out old data before new request
		$wikiElem.text("");

		var poiStr = $('#poi').val();
		$greeting.text('So, you want to explore ' + poiStr + '?');

		// wikipedia stuff
		var wikiUrl = 'http://en.wikipedia.org/w/api.php?action=opensearch&search=' + poiStr + '&format=json&callback=wikiCallback';

		var wikiRequestTimeout = setTimeout(function() {
		$wikiElem.text("failed to get wikipedia resources");
		}, 5000);
	
		$.ajax({
			url: wikiUrl,
			dataType: "jsonp",
			// jsonp: "callback",
			success: function(response) {
				var articleList = response[1];

				for (var i = 0; i < articleList.length; i++) {
					articleStr = articleList[i];
					var url = 'http://en.wikipedia.org/wiki/' + articleStr;
					$wikiElem.append('<li><a href="' + url + '">' + articleStr + '</a></li>');
				};

				clearTimeout(wikiRequestTimeout);
			}
		})
		return false;
	};

	$('#form-container').submit(this.loadData);

	// This initializes the Google Maps section, and puts markers for all the places
	this.initialize = function() {
		var mapCanvas = document.getElementById('map-canvas');
		// coordinates of central London
		var myLatLng = new google.maps.LatLng(51.5073, -0.1276);
		var mapOptions = {
			center: myLatLng,
			zoom: 13,
			mapTypeId: google.maps.MapTypeId.ROADMAP
		};
		var map = new google.maps.Map(mapCanvas,mapOptions);

		var contentString = 'You clicked this';
		var infowindow = new google.maps.InfoWindow({
			content: contentString
		});

		var numPlaces = places.length;
		for (i = 0; i < numPlaces; i ++) {
			var marker = new google.maps.Marker({
				position: places[i].latLang,
				map: map,
				title: places[i].name
			});
			google.maps.event.addListener(marker, 'click',(function(markerCopy) {
				return function() {
					infowindow.open(map,markerCopy);
					};
				})(marker));
		};

	};

	google.maps.event.addDomListener(window, 'load', this.initialize);
}

ko.applyBindings(new ViewModel());