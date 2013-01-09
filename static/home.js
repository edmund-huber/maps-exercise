(function() {

    var mapOptions = {
        center: new google.maps.LatLng(-34.397, 150.644),
        zoom: 8,
        mapTypeId: google.maps.MapTypeId.ROADMAP
    };

    var map = new google.maps.Map($("#map-canvas")[0] , mapOptions);
    var geocoder = new google.maps.Geocoder();

    var markers = {};
    var showPlacesInMap = function() {
        if (map.getBounds()) {
            $.ajax('/api/all-in-bounds/' + map.getBounds().toUrlValue())
                .fail(function() {
                    console.log('all-in-bounds lookup failed');
                })
                .done(function(d) {
                    $.each(d.results, function(_, i) {
                        var key = [i.longitude, i.latitude, i.name].join('@');
                        if (!markers.hasOwnProperty(key)) {
                            var marker = new google.maps.Marker({position: new google.maps.LatLng(i.latitude, i.longitude), title: i.name});
                            marker.setMap(map);
                            markers[key] = 1;
                            var makeInfoWindow = function() {
                                var updateForm = $('<form/>');
                                updateForm.append($('<div/>').append($('<input/>', {type: 'text', value: i.name})));
                                updateForm.append($('<div/>').append($('<input/>', {type: 'text', value: i.longitude})));
                                updateForm.append($('<div/>').append($('<input/>', {type: 'text', value: i.latitude})));
                                updateForm.append($('<div/>').append($('<input/>', {type: 'text', value: i.address})));
                                updateForm.append($('<div/>').append($('<input/>', {type: 'submit', value: 'update'})));
                                var infoWindow = new google.maps.InfoWindow({content: updateForm.html()});
                                infoWindow.open(map, marker);
                            };
                            google.maps.event.addListener(marker, 'click', makeInfoWindow);
                        }
                    });
                });
        }
    };
    google.maps.event.addListener(map, 'bounds_changed', $.debounce(2000, showPlacesInMap));
    showPlacesInMap();

    $('#new-spot-link').click(function() {
        $('#new-spot-link').fadeOut(250, function() {
            $('#new-spot-form').show();
        });
    });

    $('#new-spot-form').submit(function(e) {
        // Don't actually submit this form.
        e.preventDefault();
        Places.SubmitFlow.begin();
    });

    Places = window.Places || {};
    Places.SubmitFlow = Places.SubmitFlow || {};

    Places.SubmitFlow.begin = function() {
        // Check that they entered something.
        if (($('#new-spot-name').attr('value') == '') || ($('#new-spot-where').attr('value') == '')) {
            $('#new-spot-status').text('Please enter something!').show();
            return;
        }

        // Show 'geocoding..'
        $('#new-spot-form').fadeOut(250, function() {
            $('#new-spot-status').text('Geocoding..').show().delay(1000).queue(function(next) {
                // Find the place(s) using Google's geocoder.
                geocoder.geocode({address: $('#new-spot-where').attr('value')}, function(results, status) {
                    if (status === google.maps.GeocoderStatus.OK) {
                        if (results.length > 1) {
                            // Multiple results: let them pick out.
                            var resultsDiv = $('<div/>').append($('<div/>', {id: 'sorry-where'}).text('Sorry, where did you mean?'));
                            $.each(results, function(_, r) {
                                var choice = $('<div/>', {class: 'fake-link sorry-where-choice', text: r.formatted_address});
                                resultsDiv.append(choice);
                                choice.click(Places.SubmitFlow.resultChosen.partial(r));
                            });
                            $('#new-spot-status').html(resultsDiv);
                        } else {
                            Places.SubmitFlow.resultChosen(results[0]);
                        }
                    } else {
                        $('#new-spot-status').text("We couldn't find that address! So sorry.");
                        $('#new-spot-form').show();
                    }
                });
                next();
            });
        });
    };
 
    Places.SubmitFlow.resultChosen = function(r) {
        $('#new-spot-status').text('Submitting..');
        if (undefined !== r.geometry) {
            j = {
                longitude: r.geometry.location.lng(),
                latitude: r.geometry.location.lat(),
                address: r.formatted_address,
                name: $('#new-spot-name').attr('value')
            };
            $('#new-spot-name').attr('value', '');
            $('#new-spot-where').attr('value', '');
            $.ajax({'type': 'POST', 'url': '/api/new', 'data': j})
                .fail(function() {
                    $('#new-spot-status').text('Oops. Come back later?');
                })
                .done(function(d) {
                    showPlacesInMap();
                    map.setCenter(new google.maps.LatLng(j.latitude, j.longitude));
                    $('#new-spot-status').text('"' + j.name + '" has been submitted!').delay(3000).queue(function(next) {
                        $('#new-spot-status').hide();
                        $('#new-spot-link').show();
                        next();
                    });
                });
        } else {
            $('#new-spot-status').text('The location you gave is a little too vague. Please try again!');
            $('#new-spot-form').show();
        }
    };

})();
