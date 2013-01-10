(function() {

    Places = window.Places || {};

    Places.map = new google.maps.Map($("#map-canvas")[0], {
        center: new google.maps.LatLng(-34.397, 150.644),
        zoom: 8,
        mapTypeId: google.maps.MapTypeId.ROADMAP
    });

    Places.geocoder = new google.maps.Geocoder();

    // Show (up to 100 of) the places in the maps bounds.
    var markers = {};
    Places.showPlacesInMap = function() {

        // The map may not have fully loaded yet.
        if (!Places.map.getBounds()) {
            return;
        }

        $.ajax('/api/all-in-bounds/' + Places.map.getBounds().toUrlValue())
            .fail(function() {
                console.log('all-in-bounds lookup failed');
            })
            .done(function(d) {
                // Add a marker for this place if there isn't one already.
                $.each(d.results, function(_, place) {
                    if (!markers.hasOwnProperty(place.id)) {
                        var marker = new google.maps.Marker({position: new google.maps.LatLng(place.latitude, place.longitude), title: place.name});
                        marker.setMap(Places.map);
                        markers[place.id] = 1;
                        google.maps.event.addListener(marker, 'click', Places.makeInfoWindowForMarker.partial(marker, place));
                    }
                });
            });
    };
    google.maps.event.addListener(Places.map, 'bounds_changed', $.debounce(2000, Places.showPlacesInMap));
    Places.showPlacesInMap();

    // When a marker is clicked, we show a gmaps infowindow with an
    // update form and a delete 'link'.
    Places.makeInfoWindowForMarker = function(marker, place) {
        var updateForm = $('<form/>', {class: 'marker-update-form'});
        updateForm.append($('<input/>', {type: 'hidden', name: 'id', value: place.id}));
        updateForm.append($('<input/>', {type: 'text', name: 'name', value: place.name}));
        updateForm.append($('<input/>', {type: 'text', name: 'longitude', value: place.longitude}));
        updateForm.append($('<input/>', {type: 'text', name: 'latitude', value: place.latitude}));
        updateForm.append($('<input/>', {type: 'text', name: 'address', value: place.address}));
        updateForm.append($('<input/>', {type: 'submit', value: 'Update'}));
        var deleteLink = $('<span/>', {id: 'delete-link', class: 'fake-link', text: 'delete'});
        updateForm.append(deleteLink);
        updateForm.submit(function(e) {
            e.preventDefault();                                    
            $.ajax({type: 'POST', url: '/api/update', data: $(e.target).formToJSON()})
            infoWindow.close();
        });
        deleteLink.click(function() {
            $.ajax({type: 'POST', url: '/api/delete', data: {id: place.id}});
            infoWindow.close();
        });
        var infoWindow = new google.maps.InfoWindow({content: updateForm[0]});
        infoWindow.open(Places.map, marker);
    };

    Places.SubmitFlow = {};

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
                Places.geocoder.geocode({address: $('#new-spot-where').attr('value')}, function(results, status) {
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
            $.ajax({type: 'POST', url: '/api/new', data: j})
                .fail(function() {
                    $('#new-spot-status').text('Oops. Come back later?');
                })
                .done(function(d) {
                    Places.showPlacesInMap();
                    Places.map.setCenter(new google.maps.LatLng(j.latitude, j.longitude));
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

})();
