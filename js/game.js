let xp = 0;
let level = 0;
let energy = 2000;
const MAX_ENERGY = 2000;

const xpBar = document.getElementById("xp-bar");
const levelText = document.getElementById("level");
const currentEnergyText = document.getElementById("current-energy");
const energyFill = document.getElementById("energy-fill");

function increaseXP() {
    if (energy > 0) {
        // Зменшуємо енергію
        energy -= 1;
        currentEnergyText.textContent = energy;
        energyFill.style.width = `${(energy / MAX_ENERGY) * 100}%`;
        
        // Оновлюємо XP і Level
        xp += 1;
        if (xp >= 100) {
            level += 1;
            levelText.textContent = level;
            xp = 0;
        }
        xpBar.style.width = `${xp}%`;
    }
}

// Ініціалізація початкових значень
document.addEventListener('DOMContentLoaded', function() {
    levelText.textContent = level;
    currentEnergyText.textContent = energy;
    energyFill.style.width = '100%';
});