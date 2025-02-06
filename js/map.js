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

    map.on('load', () => {
        // Змінюємо стиль для всіх будівель
        map.setPaintProperty('building', 'fill-color', '#0066CC');
        map.setPaintProperty('building', 'fill-opacity', 0.8);
        map.setPaintProperty('building', 'fill-outline-color', '#004499');

        // Додаємо обробник кліків по будівлях
        map.on('click', 'building', (e) => {
            if (energy > 0) {
                increaseXP();
                
                // Додаємо візуальний ефект кліку
                map.setPaintProperty('building', 'fill-color', [
                    'case',
                    ['==', ['id'], e.features[0].id],
                    '#0055AA', // Колір при кліку
                    '#0066CC'  // Звичайний колір
                ]);

                // Повертаємо звичайний колір через 200мс
                setTimeout(() => {
                    map.setPaintProperty('building', 'fill-color', '#0066CC');
                }, 200);
            }
        });

        // Змінюємо курсор при наведенні на будівлі
        map.on('mouseenter', 'building', () => {
            map.getCanvas().style.cursor = 'pointer';
        });

        map.on('mouseleave', 'building', () => {
            map.getCanvas().style.cursor = '';
        });
    });

}, () => alert('Не вдалося отримати геолокацію'));