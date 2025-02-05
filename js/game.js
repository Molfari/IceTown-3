function handleBuildingTap(marker) {
    let taps = parseInt(marker.getElement().dataset.taps || '0');

    if (taps < 100) {
        taps++;
        marker.getElement().dataset.taps = taps;
        
        let xp = parseInt(document.getElementById('xp').innerText) + 1;
        document.getElementById('xp').innerText = xp;
        document.getElementById('xp-bar').style.width = (xp % 100) + '%';
        marker.getElement().style.opacity = 1 - (taps / 100);
    }
}
