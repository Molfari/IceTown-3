mapboxgl.accessToken = 'pk.eyJ1IjoiaWNldG93biIsImEiOiJjbTY3dGN0NTYwNm1yMmtzOHRuczlqbnI3In0.QSvL3pbw9YdvjHar6uyJ7g';

navigator.geolocation.getCurrentPosition(position => {
    const { latitude, longitude } = position.coords;
    const map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/dark-v10',
        center: [longitude, latitude],
        zoom: 17,
        maxZoom: 17,
        minZoom: 17
    });

    loadBuildings(map, latitude, longitude);
}, () => alert('Не вдалося отримати геолокацію'));

function loadBuildings(map, latitude, longitude) {
    fetch(`https://api.mapbox.com/v4/mapbox.mapbox-streets-v8/tilequery/${longitude},${latitude}.json?radius=100&access_token=${mapboxgl.accessToken}`)
        .then(response => response.json())
        .then(data => {
            data.features.forEach(feature => {
                const [lon, lat] = feature.geometry.coordinates;
                addBuildingMarker(map, lon, lat);
            });
        })
        .catch(error => console.error('Помилка завантаження будівель:', error));
}

function addBuildingMarker(map, lon, lat) {
    const marker = new mapboxgl.Marker({ color: 'blue' })
        .setLngLat([lon, lat])
        .addTo(map);
        function handleBuildingTap(marker) {
            increaseXP(); // Викликаємо функцію оновлення XP при тапі на будинок
        }
    marker.getElement().addEventListener('click', () => handleBuildingTap(marker));
}
