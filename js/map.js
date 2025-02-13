// Debug logging
console.log('Map.js loaded');

mapboxgl.accessToken = 'pk.eyJ1IjoiaWNldG93biIsImEiOiJjbTY3dGN0NTYwNm1yMmtzOHRuczlqbnI3In0.QSvL3pbw9YdvjHar6uyJ7g';

// Global state
const buildingProgress = new Map();
const buildingTimers = new Map();
const freezeTimers = new Map();
let userMarker = null;
let radiusCircle = null;

// Constants
const ACTION_RADIUS = 25; // радіус дії в метрах
const COIN_GENERATION_TIME = 100; // секунд
const COINS_PER_SECOND = 1;
const MAX_COINS_PER_BUILDING = 100;
const FREEZE_DELAY = 10000; // 10 секунд до початку заморозки
const FREEZE_INTERVAL = 2000; // 2 секунди між збільшенням заморозки
const FREEZE_RATE = 1; // 1% за раз

// Utility functions
function calculateDistance(point1, point2) {
    console.log('Calculating distance between points:', { point1, point2 });
    
    const R = 6371000; // радіус Землі в метрах
    const φ1 = point1[1] * Math.PI / 180;
    const φ2 = point2[1] * Math.PI / 180;
    const Δφ = (point2[1] - point1[1]) * Math.PI / 180;
    const Δλ = (point2[0] - point1[0]) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
             Math.cos(φ1) * Math.cos(φ2) *
             Math.sin(Δλ/2) * Math.sin(Δλ/2);
             
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    console.log('Calculated distance:', distance);
    return distance;
}

function isPointInRadius(point, userPosition, radius) {
    console.log('Checking if point is in radius:', { point, userPosition, radius });
    const distance = calculateDistance(
        [userPosition.lng, userPosition.lat],
        point
    );
    const result = distance <= radius;
    console.log('Point in radius:', result);
    return result;
}

function isBuildingInRadius(buildingFeature, userPosition, radius) {
    console.log('Checking if building is in radius:', { 
        buildingId: buildingFeature.id, 
        userPosition, 
        radius 
    });
    
    const coordinates = buildingFeature.geometry.coordinates[0];
    const result = coordinates.some(point => isPointInRadius(point, userPosition, radius));
    
    console.log('Building in radius:', result);
    return result;
}

// Building progress management
function createOrUpdateProgressElement(buildingId, coordinates, map) {
    console.log('Creating/Updating progress element:', { buildingId, coordinates });
    
    let progress = buildingProgress.get(buildingId);
    console.log('Current progress:', progress);
    
    if (!progress) {
        console.error('No progress found for building:', buildingId);
        return;
    }

    if (!progress.element) {
        console.log('Creating new progress element');
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
        progress.coordinates = coordinates;
    }

    const point = map.project(progress.coordinates);
    progress.element.style.left = `${point.x}px`;
    progress.element.style.top = `${point.y}px`;

    const textElement = progress.element.querySelector('.tap-progress-text');
    if (progress.isGeneratingCoins) {
        console.log('Updating coin generation progress:', progress.coins);
        textElement.textContent = `${progress.coins}/${MAX_COINS_PER_BUILDING}`;
        progress.element.firstChild.style.setProperty('--progress', 
            (progress.coins / MAX_COINS_PER_BUILDING) * 100);
        textElement.classList.add('generating-coins');
        progress.element.firstChild.classList.add('generating-coins');
    } else {
        console.log('Updating unfreezing progress:', progress.taps);
        textElement.textContent = `${progress.taps}%`;
        progress.element.firstChild.style.setProperty('--progress', progress.taps);
        textElement.classList.remove('generating-coins');
        progress.element.firstChild.classList.remove('generating-coins');
    }
}

function startCoinGeneration(buildingId, map, buildingFeature) {
    console.log('Starting coin generation for building:', buildingId);
    
    const progress = buildingProgress.get(buildingId);
    progress.isGeneratingCoins = true;
    progress.coins = 0;
    
    map.setPaintProperty(
        'building',
        'fill-color',
        [
            'match',
            ['id'],
            buildingId,
            '#FFD700',
            '#0066CC'
        ]
    );

    const timer = setInterval(() => {
        if (progress.coins < MAX_COINS_PER_BUILDING) {
            progress.coins += COINS_PER_SECOND;
            window.gameAPI.updateCoins(COINS_PER_SECOND);
            createOrUpdateProgressElement(buildingId, progress.coordinates, map);
            console.log('Generated coins:', progress.coins);
        } else {
            console.log('Coin generation complete');
            stopCoinGeneration(buildingId, map, buildingFeature);
        }
    }, 1000);

    buildingTimers.set(buildingId, timer);
}

function stopCoinGeneration(buildingId, map, buildingFeature) {
    console.log('Stopping coin generation for building:', buildingId);
    
    const timer = buildingTimers.get(buildingId);
    if (timer) {
        clearInterval(timer);
        buildingTimers.delete(buildingId);
    }

    // Очистка існуючих таймерів заморозки
    const existingTimer = freezeTimers.get(buildingId);
    if (existingTimer) {
        clearTimeout(existingTimer.initialTimer);
        clearInterval(existingTimer.freezeTimer);
        freezeTimers.delete(buildingId);
    }

    const progress = buildingProgress.get(buildingId);
    if (progress) {
        progress.isGeneratingCoins = false;
        progress.taps = 100;
        progress.coins = 0;
        
        if (progress.element) {
            progress.element.remove();
        }
        
        buildingProgress.delete(buildingId);
    }

    map.setPaintProperty(
        'building',
        'fill-color',
        [
            'match',
            ['id'],
            buildingId,
            '#0066CC',
            '#0066CC'
        ]
    );
}

function updateCircleRadius(map, center) {
    if (!radiusCircle) return;

    const zoom = map.getZoom();
    const userLocation = userMarker.getLngLat();
    const centerPoint = [userLocation.lng, userLocation.lat];
    const eastPoint = [
        userLocation.lng + (ACTION_RADIUS / (111111 * Math.cos(userLocation.lat * Math.PI / 180))),
        userLocation.lat
    ];
    
    const centerPx = map.project(centerPoint);
    const eastPx = map.project(eastPoint);
    const radiusInPixels = Math.abs(eastPx.x - centerPx.x);
    
    radiusCircle.style.width = `${radiusInPixels * 2}px`;
    radiusCircle.style.height = `${radiusInPixels * 2}px`;
}

function updateUserLocation(map) {
    console.log('Updating user location');
    
    navigator.geolocation.getCurrentPosition(
        position => {
            console.log('Got user position:', position.coords);
            
            const { latitude, longitude } = position.coords;
            const newLocation = new mapboxgl.LngLat(longitude, latitude);
            
            if (!userMarker) {
                console.log('Creating new user marker');
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
                console.log('Updating user marker position');
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
    console.log('Initial position received:', position.coords);
    
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
        console.log('Map loaded');
        
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
            console.log('Building clicked');

            if (!window.gameAPI) {
                console.error('gameAPI not found!');
                return;
            }

            const energy = window.gameAPI.getEnergy();
            console.log('Current energy:', energy);

            if (energy > 0 && userMarker) {
                const userPosition = userMarker.getLngLat();
                const buildingFeature = e.features[0];
                
                if (isBuildingInRadius(buildingFeature, userPosition, ACTION_RADIUS)) {
                    const buildingId = buildingFeature.id;
                    let progress = buildingProgress.get(buildingId) || { 
                        taps: 100, 
                        element: null, 
                        coordinates: null,
                        isGeneratingCoins: false,
                        coins: 0
                    };

                    if (!progress.isGeneratingCoins && progress.taps > 0) {
                        if (window.gameAPI.increaseXP()) {
                            const existingTimer = freezeTimers.get(buildingId);
                            if (existingTimer) {
                                clearTimeout(existingTimer.initialTimer);
                                clearInterval(existingTimer.freezeTimer);
                            }

                            progress.taps -= 1;
                            buildingProgress.set(buildingId, progress);
                            createOrUpdateProgressElement(buildingId, e.lngLat, map);

                            if (progress.taps > 0) {
                                const initialTimer = setTimeout(() => {
                                    console.log('Starting freeze process for building:', buildingId);
                                    const freezeTimer = setInterval(() => {
                                        const currentProgress = buildingProgress.get(buildingId);
                                        if (currentProgress && !currentProgress.isGeneratingCoins) {
                                            currentProgress.taps = Math.min(100, currentProgress.taps + FREEZE_RATE);
                                            
                                            if (currentProgress.taps >= 100) {
                                                clearInterval(freezeTimer);
                                                if (currentProgress.element) {
                                                    currentProgress.element.remove();
                                                }
                                                buildingProgress.delete(buildingId);
                                                freezeTimers.delete(buildingId);
                                            } else {
                                                createOrUpdateProgressElement(buildingId, currentProgress.coordinates, map);
                                            }
                                        } else {
                                            clearInterval(freezeTimer);
                                            freezeTimers.delete(buildingId);
                                        }
                                    }, FREEZE_INTERVAL);

                                    freezeTimers.set(buildingId, { initialTimer, freezeTimer });
                                }, FREEZE_DELAY);

                                freezeTimers.set(buildingId, { initialTimer, freezeTimer: null });
                            }

                            if (progress.taps === 0) {
                                const existingTimer = freezeTimers.get(buildingId);
                                if (existingTimer) {
                                    clearTimeout(existingTimer.initialTimer);
                                    clearInterval(existingTimer.freezeTimer);
                                    freezeTimers.delete(buildingId);
                                }
                                startCoinGeneration(buildingId, map, buildingFeature);
                            }
                        }
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
}, error => {
    console.error('Failed to get initial position:', error);
    alert('Не вдалося отримати геолокацію');
});