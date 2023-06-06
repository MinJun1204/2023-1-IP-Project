const API_KEY = 'T5vQIOQm4342YA16mXuzkw'
const URL = 'https://api.odsay.com/v1/api/searchPubTransPathT?SX=126.926493082645&SY=37.6134436427887&EX=127.126936754911&EY=37.5004198786564&apiKey=T5vQIOQm4342YA16mXuzkw'

let startPos, endPos, polyline

$(document).ready(async function() {

    let mapOptions = {
        center: new N.LatLng(37.3595704, 127.105399),
        zoom: 20,
        // mapTypeId: N.MapTypeId.HYBRID
    }

    let map = new N.Map('map', mapOptions)

    let seoul = N.LatLngBounds(
        N.LatLng(37.42829747263545, 126.76620435615891),
        N.LatLng(37.7010174173061, 127.18379493229875)
    )

    let marker = new N.Marker({
        position: N.LatLng(37.6134436427887, 126.926493082645),
        map: map
    })

    let marker2 = new N.Marker({
        position: N.LatLng(37.5004198786564, 127.126936754911),
        map: map
    })

    // let polyline = new N.Polyline({
    //     map: map,
    //     path: [
    //         new N.LatLng(37.6134436427887, 126.926493082645),
    //         new N.LatLng(37.5004198786564, 127.126936754911),
    //     ],
    //     strokeWeight: 10
    // });

    polyline = new N.Polyline({
        map: map,
        path: [],
        strokeColor: '#5347AA',
        strokeWeight: 6
    });
    
    N.Event.addListener(map, 'click', async function(e) {
        let point = e.latlng

        if (!startPos) {
            startPos = point
        } else if (!endPos) {
            endPos = point
        } else {
            return
        }
    
        // let path = polyline.getPath()
        // path.push(point)
    
        new N.Marker({
            map: map,
            position: point
        })

        if (startPos && endPos) {
            let directions = await getDirection()
            console.log(polyline)
            drawPath(directions)
        }
    })

    // map.setZoom(1)
    map.fitBounds(seoul)
    // map.panBy(N.Point(100, 100))

    let result = await fetchAPI(URL)

    // console.log(result.result)
})

async function fetchAPI(url) {
    let response = fetch(url)
    
    return response.then(data => data.json())
}

async function getDirection() {
    let URL = 'https://api.odsay.com/v1/api/searchPubTransPathT?'
            + `SX=${startPos.x}&`
            + `SY=${startPos.y}&`
            + `EX=${endPos.x}&`
            + `EY=${endPos.y}&`
            + `apiKey=${API_KEY}`

    return await fetchAPI(URL)
}

function drawPath(directions) {
    console.log(directions)

    let path = directions.result.path[0].subPath
    // let polyline = new N.Polyline({
    //     map: map,
    //     path: [],
    //     strokeColor: '#000000',
    //     strokeWeight: 6
    // });
    let points = polyline.getPath()

    points.push(new N.LatLng(startPos.y, startPos.x))

    for (let subPath of path) {
        console.log(subPath)
        if (subPath.trafficType != 3) {
            points.push(new N.LatLng(subPath.startY, subPath.startX))

            for (let station of subPath.passStopList.stations) {
                points.push(new N.LatLng(station.y, station.x))
            }

            points.push(new N.LatLng(subPath.endY, subPath.endX))
        }
    }

    points.push(new N.LatLng(endPos.y, endPos.x))

    console.log(points)
}