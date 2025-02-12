mapboxgl.accessToken = 'pk.eyJ1IjoiaWNldG93biIsImEiOiJjbTY3dGN0NTYwNm1yMmtzOHRuczlqbnI3In0.QSvL3pbw9YdvjHar6uyJ7g';

const buildingProgress = new Map();
let userMarker = null;
let radiusCircle = null;
const ACTION_RADIUS = 50; // радіус дії в метрах

function calculateDistance(point1, point2) {
    const toRad = angle => angle * (Math.PI / 180);
    
    const lat1 = point1[1];
    const lon1 = point1[0];
    const lat2 = point2[1];
    const lon2 = point2[0];
    
    const R = 6371000; // радіус Землі в метрах
    
    const φ1 = toRad(lat1);
    const φ2 = toRad(lat2);
    const Δφ = toRad(lat2 - lat1);
    const Δλ = toRad(lon2 - lon1);
    
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
             Math.cos(φ1) * Math.cos(φ2) *
             Math.sin(Δλ/2) * Math.sin(Δλ/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    
    return R * c; // відстань в метрах
}

function isWithinActionRadius(userPosition, targetPoint, radius) {
    const distance = calculateDistance(
        [userPosition.lng, userPosition.lat],
        [targetPoint.lng, targetPoint.lat]
    );
    return distance <= radius;
}

function updateCircleRadius(map, center) {
    if (!radiusCircle) return;

    // Отримуємо точки на відстані радіусу на північ та схід
    const lat = center.lat;
    const lng = center.lng;
    const radius = ACTION_RADIUS / 111111; // конвертуємо метри в градуси

    // Точка на відстані радіусу
    const targetPoint = new mapboxgl.LngLat(lng + radius, lat);
    
    // Конвертуємо в піксельні координати
    const centerPx = map.project(center);
    const targetPx = map.project(targetPoint);
    
    // Розраховуємо діаметр
    const radiusInPixels = Math.abs(targetPx.x - centerPx.x);
    
    radiusCircle.style.width = `${radiusInPixels * 2}px`;
    radiusCircle.style.height = `${radiusInPixels * 2}px`;
}

function updateUserLocation(map) {
    navigator.geolocation.getCurrentPosition(
        position => {
            const { latitude, longitude } = position.coords;
            const newLocation = new mapboxgl.LngLat(longitude, latitude);
            
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
                updateCircleRadius(map, newLocation);
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
        zoom: 18,
        maxZoom: 18,
        minZoom: 18,
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
                updateCircleRadius(map, userMarker.getLngLat());
            }

            buildingProgress.forEach((progress) => {
                if (progress.element && progress.coordinates) {
                    const point = map.project(progress.coordinates);
                    progress.element.style.left = `${point.x}px`;
                    progress.element.style.top = `${point.y}px`;
                }
            });
        });

        map.on('zoom', () => {
            if (userMarker) {
                updateCircleRadius(map, userMarker.getLngLat());
            }
        });

        map.on('click', 'building', (e) => {
            if (energy > 0) {
                const buildingPoint = e.lngLat;
                const userPosition = userMarker.getLngLat();
                
                // Перевіряємо чи клік був в межах радіусу дії
                if (isWithinActionRadius(userPosition, buildingPoint, ACTION_RADIUS)) {
                    const buildingId = e.features[0].id;
                    
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
                } else {
                    console.log('Building is outside of action radius');
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