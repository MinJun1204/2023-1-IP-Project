$(document).ready(function() {
    $('#departure, #destination')
        .focus(function() {
            $('#map').css('display', 'none');
            $('#search').css('display', 'block');
        })
        .blur(function() {
            $('#map').css('display', 'block');
            $('#search').css('display', 'none');
        })
})