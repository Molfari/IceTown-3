mapboxgl.accessToken = 'pk.eyJ1IjoiaWNldG93biIsImEiOiJjbTY3dGN0NTYwNm1yMmtzOHRuczlqbnI3In0.QSvL3pbw9YdvjHar6uyJ7g';

const buildingProgress = new Map();
let userMarker = null;
let radiusCircle = null;

function calculateDistance(point1, point2) {
    const lat1 = point1[1];
    const lon1 = point1[0];
    const lat2 = point2[1];
    const lon2 = point2[0];
    
    const R = 6371e3;
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
}

function updateUserLocation(map) {
    navigator.geolocation.getCurrentPosition(
        position => {
            const { latitude, longitude } = position.coords;
            const newLocation = new mapboxgl.LngLat(longitude, latitude);
            
            // Встановлюємо обмеження для скролу карти
            const bounds = [
                [longitude - 0.005, latitude - 0.005],
                [longitude + 0.005, latitude + 0.005]
            ];
            map.setMaxBounds(bounds);
            
            if (!userMarker) {
                const el = document.createElement('div');
                el.className = 'user-location-marker';
                userMarker = new mapboxgl.Marker(el)
                    .setLngLat(newLocation)
                    .addTo(map);

                if (!radiusCircle) {
                    const radiusEl = document.createElement('div');
                    radiusEl.className = 'radius-circle';
                    document.body.appendChild(radiusEl);
                    radiusCircle = radiusEl;
                }
            } else {
                userMarker.setLngLat(newLocation);
            }
            
            const markerPosition = map.project(newLocation);
            if (radiusCircle) {
                const mapContainer = map.getContainer();
                const mapBounds = mapContainer.getBoundingClientRect();
                radiusCircle.style.left = `${markerPosition.x}px`;
                radiusCircle.style.top = `${markerPosition.y + mapBounds.top}px`;
            }
            
            map.setCenter(newLocation);
        },
        error => console.error('Помилка отримання геолокації:', error),
        {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
        }
    );
}

navigator.geolocation.getCurrentPosition(position => {
    const { latitude, longitude } = position.coords;
    const map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/dark-v10',
        center: [longitude, latitude],
        zoom: 19,
        maxZoom: 19,
        minZoom: 19,
        pitch: 0,
        maxPitch: 0,
        dragRotate: false
    });

    map.on('load', () => {
        map.setPaintProperty('building', 'fill-color', '#0066CC');
        map.setPaintProperty('building', 'fill-opacity', 0.8);
        map.setPaintProperty('building', 'fill-outline-color', '#004499');

        updateUserLocation(map);
        setInterval(() => updateUserLocation(map), 30000);

        map.on('move', () => {
            if (userMarker && radiusCircle) {
                const newPosition = map.project(userMarker.getLngLat());
                const mapContainer = map.getContainer();
                const mapBounds = mapContainer.getBoundingClientRect();
                radiusCircle.style.left = `${newPosition.x}px`;
                radiusCircle.style.top = `${newPosition.y + mapBounds.top}px`;
            }

            // Оновлення позиції всіх каунтерів при русі карти
            buildingProgress.forEach((progress) => {
                if (progress.element && progress.coordinates) {
                    const point = map.project(progress.coordinates);
                    progress.element.style.left = `${point.x}px`;
                    progress.element.style.top = `${point.y}px`;
                }
            });
        });

        map.on('click', 'building', (e) => {
            if (energy > 0) {
                const buildingPoint = e.lngLat;
                const userPosition = userMarker.getLngLat();
                const distance = calculateDistance(
                    [userPosition.lng, userPosition.lat],
                    [buildingPoint.lng, buildingPoint.lat]
                );

                if (distance <= 50) {
                    const buildingId = e.features[0].id;
                    const clickPoint = e.point;
                    
                    let progress = buildingProgress.get(buildingId) || { taps: 100, element: null, coordinates: null };

                    if (progress.taps > 0) {
                        if (!progress.element) {
                            const container = document.createElement('div');
                            container.className = 'tap-progress-container';
                            const progressElement = document.createElement('div');
                            progressElement.className = 'tap-progress';
                            const textElement = document.createElement('span');
                            textElement.className = 'tap-progress-text';
                            progressElement.appendChild(textElement);
                            container.appendChild(progressElement);
                            document.body.appendChild(container);
                            progress.element = container;
                            progress.coordinates = buildingPoint;
                        }

                        progress.taps -= 1;
                        const point = map.project(progress.coordinates);
                        progress.element.style.left = `${point.x}px`;
                        progress.element.style.top = `${point.y}px`;
                        const textElement = progress.element.querySelector('.tap-progress-text');
                        textElement.textContent = `${progress.taps}%`;
                        progress.element.firstChild.style.setProperty('--progress', progress.taps);

                        buildingProgress.set(buildingId, progress);

                        if (progress.taps === 0) {
                            const buildingFeature = e.features[0];
                            const buildingLayer = map.getLayer('building');
                            
                            if (buildingLayer) {
                                map.setPaintProperty(
                                    'building',
                                    'fill-color',
                                    [
                                        'match',
                                        ['id'],
                                        buildingFeature.id,
                                        '#FFFFFF',
                                        '#0066CC'
                                    ]
                                );
                            }
                            
                            setTimeout(() => {
                                progress.element.remove();
                                buildingProgress.delete(buildingId);
                            }, 1000);
                        }

                        increaseXP();
                    }
                }
            }
        });

        map.on('mouseenter', 'building', () => {
            map.getCanvas().style.cursor = 'pointer';
        });

        map.on('mouseleave', 'building', () => {
            map.getCanvas().style.cursor = '';
        });
    });

}, () => alert('Не вдалося отримати геолокацію'));

setInterval(() => {
    buildingProgress.forEach((progress, buildingId) => {
        if (progress.taps < 100) {
            progress.taps += 1;
            if (progress.element) {
                const textElement = progress.element.querySelector('.tap-progress-text');
                textElement.textContent = `${progress.taps}%`;
                progress.element.firstChild.style.setProperty('--progress', progress.taps);

                if (progress.taps === 100) {
                    progress.element.remove();
                    buildingProgress.delete(buildingId);
                }
            }
        }
    });
}, 2000);