const API_KEY = 'qLfO4s5Ypjdm2XrqCvbAhQ'
const URL = 'https://api.odsay.com/v1/api/searchPubTransPathT?SX=126.926493082645&SY=37.6134436427887&EX=127.126936754911&EY=37.5004198786564&apiKey=T5vQIOQm4342YA16mXuzkw'
const LIMIT = 3

let startPos, endPos, polyline
let map, places
let departure, destination
let searchResult, directionResult

$(document).ready(async function() {
    initUI()
    initMap()
    getGeolocation()
    setPointByClick()
    search()
})

async function initMap() {
    // Kakao Maps

    let container = document.getElementById('map')
    let options = {
        center: new kakao.maps.LatLng(33.450701, 126.570667),
        level: 3
    }

    map = new kakao.maps.Map(container, options)
    places = new kakao.maps.services.Places()
}

function getGeolocation() {
    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(async (position) => {
            console.log('User Position:', position)

            setCenter(position.coords.longitude, position.coords.latitude)
            setCurrentPositionMarker(position.coords.longitude, position.coords.latitude)

            let lowBusStations = await searchLowBusStations(position)
            
            showLowBusStations(lowBusStations.result.station)
        })

    } else {
        alert('내 위치 정보를 가져올 수 없습니다.')
    }
}

async function searchLowBusStations(position) {
    let URL = 'https://api.odsay.com/v1/api/pointSearch?'
            + `lang=0&`
            + `x=${position.coords.longitude}&`
            + `y=${position.coords.latitude}&`
            + `radius=500&`
            + `apiKey=${API_KEY}`

    return await fetchAPI(URL)
}

async function showLowBusStations(stations) {
    // stations = stations.slice(0, LIMIT)
    console.log(stations)

    for (let station of stations) {
        let iwContent = `<div style="padding: 5px;"><h3>${station.stationName}</h3><p>${station.arsID.replace('-', '')}</p>`
        let realtimeInfo = await getRealTimeArrival(station.stationID)

        if (realtimeInfo.result.error) continue

        for (let busRoute of realtimeInfo.result.real) {

            iwContent += `<b>${busRoute.routeNm}&nbsp;</b>`

            if (busRoute.arrival1)
                iwContent += `<span class="red">${Math.floor(busRoute.arrival1.arrivalSec / 60)}분 ${busRoute.arrival1.arrivalSec % 60}초 | ${busRoute.arrival1.leftStation}정류장 전</span><br>`
            else
                iwContent += `<span class="gray">도착 정보 없음</span><br>`
        }

        let markerPosition = new kakao.maps.LatLng(station.y, station.x)
        let marker = new kakao.maps.Marker({
            position: markerPosition,
            clickable: true
        })

        marker.setMap(map)

        iwContent += '</div>'

        let iwRemovable = true
        let infoWindow = new kakao.maps.InfoWindow({
            content: iwContent,
            removable: iwRemovable
        })

        kakao.maps.event.addListener(marker, 'click', function() {
            infoWindow.open(map, marker)
        })
    }
}

function setPointByClick() {
    kakao.maps.event.addListener(map, 'click', async function(mouseEvent) {
        let latlng = mouseEvent.latLng

        if (!departure && !destination) {
            setMarkerByClick(latlng.getLng(), latlng.getLat(), true)
            coordsToAddress(latlng, true)
        } else if (departure && !destination) {
            setMarkerByClick(latlng.getLng(), latlng.getLat(), false)
            coordsToAddress(latlng, false)
        }
    })
}

function coordsToAddress(latlng, isDeparture) {
    let geocoder = new kakao.maps.services.Geocoder()
    let ret = {}

    ret.x = latlng.getLng()
    ret.y = latlng.getLat()

    geocoder.coord2Address(latlng.getLng(), latlng.getLat(), (result, status) => {
        if (status == kakao.maps.services.Status.OK) {
            if (result[0].road_address) {
                ret.place_name = result[0].road_address.address_name
            } else {
                ret.place_name = result[0].address.address_name
            }

            console.log(ret)

            if (isDeparture) {
                departure = ret
                $('#departure').val(ret.place_name)
            } else {
                destination = ret
                $('#destination').val(ret.place_name)
            }

            if (departure && destination) showDirections()
        } 
    })

}

function setMarkerByClick(x, y, isDeparture) {
    let imageSrc

    if (isDeparture) imageSrc = 'https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/red_b.png'
    else             imageSrc = 'https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/blue_b.png'

    let imageSize = new kakao.maps.Size(64, 49)
    let imageOption = { offset: new kakao.maps.Point(27, 69) }

    let markerImage = new kakao.maps.MarkerImage(imageSrc, imageSize, imageOption)
    let markerPosition = new kakao.maps.LatLng(y, x)

    let marker = new kakao.maps.Marker({
        position: markerPosition,
        image: markerImage
    })

    marker.setMap(map)
}

function search() {
    $('input').keypress(async function(e) {
        let input = this
        
        // When Enter Key Pressed
        if (e.which == 13 || e.keyCode == 13) {
            let selected = this.id
            let keyword = $(this).val()
            $('#search').empty()

            places.keywordSearch(keyword, async function(result, status) {
                if (status == kakao.maps.services.Status.OK) {
                    searchResult = result

                    $('#search').empty()

                    // Show Place List
                    for (let i in result) {
                        // console.log(result[i])

                        let $container = $(`<div class="place" id="place${i}"></div>`)
                        let $name = $(`<h2>${result[i].place_name}</h2>`)
                        let $address = $(`<p>${result[i].road_address_name}</p>`)
                        let $hr = $('<hr>')

                        $container.append($name).append($address).append($hr)
                        $('#search').append($container)
                    }

                    $('.place').on('click', async function() {
                        let id = parseInt(this.id.replace('place', ''))

                        if (selected == 'departure') {
                            departure = searchResult[id]
                            $(input).val(departure.place_name)

                            searchResult = undefined
                            $('#search').empty().hide(500)
                            $('#map').show(500)

                            setCenter(departure.x, departure.y)
                            setMarkerByClick(departure.x, departure.y, true)
                        } else {
                            destination = searchResult[id]
                            $(input).val(destination.place_name)

                            searchResult = undefined
                            $('#search').empty().hide(500)
                            $('#map').show(500)

                            setCenter(destination.x, destination.y)
                            setMarkerByClick(destination.x, destination.y, false)
                        }

                        if (departure && destination) {
                            showDirections()
                        }
                    })
                } else {
                    console.log('No Result')
                }
            })
        }
    })

    
}

async function fetchAPI(url) {
    let response = fetch(url)
    
    return response.then(data => data.json())
}

async function getDirection(dep, dest) {
    let URL = 'https://api.odsay.com/v1/api/searchPubTransPathT?'
            + `SX=${dep.x}&`
            + `SY=${dep.y}&`
            + `EX=${dest.x}&`
            + `EY=${dest.y}&`
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

function initUI() {
    $('#departure, #destination')
        .focus(function() {
            $('#map').hide(500);
            $('#search').show(500);
        })
}

async function showDirections() {
    let directions = await getDirection(departure, destination)
    directions = await lowBusFilter(directions.result)

    $('#map').hide()
    $('#result').show()

    for (let i in directions) {
        let direction = directions[i]
        // console.log(direction)

        let $direction = $(`<div class="direction" id="direction${i}"></div>`)

        let $info = $(`<div></div>`)
        let $totalTime = $(`<h2>${direction.info.totalTime}분&nbsp;</h2>`)
        let $distance = $(`<span>${(direction.info.totalDistance / 1000).toFixed(1)}km</span>`)
        // let $firstStation = $(`<p>${direction.info.firstStartStation} 정류장</p>`)

        $info.append($totalTime).append($distance)
        $direction.append($info)

        for (let path of direction.subPath) {
            let $path = $('<div></div>')

            if (path.trafficType == 1 || path.trafficType == 2) {
                let $laneNo, $startStation

                if (path.trafficType == 1) {
                    $laneNo = $(`<p class="subwayLaneNo">${path.lane[0].name.replace('수도권 ', '')}</p>`)
                    $startStation = $(`<p class="subwayStation">${path.startName}역</p>`)
                } else if (path.trafficType == 2) {
                    $laneNo = $(`<p class="busLaneNo">${path.lane[0].busNo}</p>`)
                    $startStation = $(`<p class="busStation">${path.startName} 정류장</p>`)
                }

                $path.append($laneNo).append($startStation)
            } else {
                continue
            }

            $direction.append($path)
        }

        let $endStation = $(`<div><p>${direction.info.lastEndStation} 정류장</p></div>`)
        $direction.append($endStation).append('<hr>')

        $('#result').append($direction)
    }

    $('.direction').on('click', function() {
        let route = directions[this.id.replace('direction', '')]
        showDetailRoute(route)
    })
}

async function lowBusFilter(directions) {
    // directions.path = directions.path.slice(6, 6 + LIMIT)

    let result = []

    for (let path of directions.path) {
        let isAllLowBus = true
        
        for (let subPath of path.subPath) {
            // console.log('------------------------')

            if (subPath.trafficType == 2) {
                let isLowBusExists = false
                let lanes = []

                for (let l of subPath.lane) {
                    lanes.push(l.busID)
                }

                // console.log('Lanes:', lanes)

                let result = await getRealTimeArrival(subPath.startID)

                console.log(result)

                if (result.result.error) {
                    isAllLowBus = false
                    break
                }

                for (let lowBuses of result.result.real) {
                    // console.log(lowBuses.routeId, lanes, parseInt(lowBuses.routeId) in lanes)
                    if (lanes.includes(parseInt(lowBuses.routeId))) {
                        // console.log('Low Bus:', lowBuses.routeNm)
                        isLowBusExists = true
                        break
                    }
                    // console.log('lowBus:', lowBuses)
                }

                if (!isLowBusExists) {
                    isAllLowBus = false
                    break
                }
            }
        }

        if (isAllLowBus) {
            result.push(path)
        }
    }

    return result
}

async function getRealTimeArrival(id) {
    let URL = 'https://api.odsay.com/v1/api/realtimeStation?'
            + `stationID=${id}&`
            + `lowBus=1&`
            + `apiKey=${API_KEY}`

    return await fetchAPI(URL)
}

async function showDetailRoute(route) {
    $('#result').hide(500)
    $('#detail').show(500).empty().append($(`<button id="showMap">지도 보기</button>`))

    $('#showMap').on('click', function() {
        $('#map').show()
        $('#detail').hide()
    })

    console.log(route)

    let $start = $(`<div><h2>출발 </h2><p>${departure.place_name}</p></div>`)
    let $end = $(`<div><h2>도착 </h2><p>${destination.place_name}</p></div>`)

    $('#detail').append($start)

    for (let path of route.subPath) {
        let $path

        if (path.trafficType == 1) {
            $path = $(`<div><h2>${path.lane[0].name.replace('수도권 ', '')} </h2><p>${path.startName}역 승차 | ${path.sectionTime}분</p></div><div><h2>하차 </h2><p>${path.endName}역 하자</p></div>`)
        } else if (path.trafficType == 2) {
            $path = $('<div></div>')
            $start = $(`<div><h2>버스 </h2><p>${path.startName} 정류장 (${path.startArsID.replace('-', '')}) 승차 | ${path.sectionTime}분</p><br></div>`)

            let lowBusArrival = await getRealTimeArrival(path.startID)
            console.log(lowBusArrival)
            
            for (let lane of path.lane) {
                for (let lowBusLane of lowBusArrival.result.real) {
                    if (lowBusLane.routeId == lane.busID) {
                        console.log(lowBusLane)

                        if (lowBusLane.arrival1) {
                            $start.append(`<div><p>${lane.busNo} (저상) <span class="red">${Math.floor(lowBusLane.arrival1.arrivalSec / 60)}분 ${lowBusLane.arrival1.arrivalSec % 60}초 | ${lowBusLane.arrival1.leftStation}정류장 전</span><p></div>`)
                        } else {

                        }
                    }
                }

            }

            $end = $(`<div><h2>하차 </h2><p>${path.endName} 정류장 (${path.endArsID.replace('-', '')}) 하차</div>`)
            $path.append($start).append($end)
        } else {
            $path = $(`<div><h2>도보 </h2><p>${path.sectionTime}분 | ${path.distance}m 이동</p></div>`)
        }

        $('#detail').append($path)
    }

    $('#detail').append($end)

    showRouteOnMap(route)
}

// Map Functions

function setCenter(x, y) {
    let moveLocation = new kakao.maps.LatLng(y, x)
    map.panTo(moveLocation)
}

function setMarker(x, y) {
    let markerLocation = new kakao.maps.LatLng(y, x)
    let marker = new kakao.maps.Marker({
        position: markerLocation
    })

    marker.setMap(map)
}

function setCurrentPositionMarker(x, y) {
    let imgSrc = 'https://static.vecteezy.com/system/resources/previews/016/314/339/original/red-circle-red-dot-icon-free-png.png'
    let imgSize = new kakao.maps.Size(32, 32)
    // let imgOption = { offset: new kakao.maps.Point(27, 69) }

    let markerImage = new kakao.maps.MarkerImage(imgSrc, imgSize)
    let markerPosition = new kakao.maps.LatLng(y, x)

    let marker = new kakao.maps.Marker({
        position: markerPosition,
        image: markerImage
    })

    marker.setMap(map)
}

function showRouteOnMap(route) {
    let linePath = []

    linePath.push(new kakao.maps.LatLng(departure.y, departure.x))

    for (let subPath of route.subPath) {
        if (subPath.trafficType == 1 || subPath.trafficType == 2) {
            linePath.push(new kakao.maps.LatLng(subPath.startY, subPath.startX))

            for (let station of subPath.passStopList.stations) {
                linePath.push(new kakao.maps.LatLng(station.y, station.x))
            }

            linePath.push(new kakao.maps.LatLng(subPath.endY, subPath.endX))
        }
    }

    linePath.push(new kakao.maps.LatLng(destination.y, destination.x))

    let polyline = new kakao.maps.Polyline({
        path: linePath,
        strokeWeight: 10,
        strokeColor: '#1e21c7',
        strokeOpacity: 1,
        strokeStyle: 'solid'
    })

    polyline.setMap(map)
}