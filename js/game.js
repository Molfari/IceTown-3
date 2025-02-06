let xp = 0;
let level = 0;
const xpBar = document.getElementById("xp-bar");
const xpText = document.getElementById("xp");
const levelText = document.getElementById("level");

function increaseXP() {
    xp += 1; // Додаємо 1 XP тільки при тапі на будинок

    if (xp >= 100) { // Коли XP-бар заповнюється
        level += 1; // Додаємо Level +1
        levelText.textContent = level; // Оновлюємо відображення Level
        xp = 0; // XP-бар скидається до 0
    }

    xpBar.style.width = `${xp}%`; // Оновлюємо статус-бар
    xpText.textContent = xp; // Оновлюємо значення XP
}