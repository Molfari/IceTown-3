// Debug logging
console.log('Game.js loaded');

// Game state
let xp = 0;
let level = 0;
let energy = 2000;
let coins = 0;
const MAX_ENERGY = 2000;

// DOM Elements
const xpBar = document.getElementById("xp-bar");
const levelText = document.getElementById("level");
const currentEnergyText = document.getElementById("current-energy");
const energyFill = document.getElementById("energy-fill");
const coinsElement = document.getElementById("coins");

// Telegram WebApp integration
let telegramWebApp;
let userData = null;

// Валідація даних WebApp
function validateWebAppData(initData) {
    try {
        const urlParams = new URLSearchParams(initData);
        const hash = urlParams.get('hash');
        if (!hash) return false;
        
        urlParams.delete('hash');
        return true;
    } catch (error) {
        console.error('WebApp validation error:', error);
        return false;
    }
}

// Функція для оновлення XP та енергії
function increaseXP() {
    console.log('increaseXP called', { energy, xp, level }); // Debug log

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
            
            // Відправляємо дані про новий рівень в Telegram
            if (telegramWebApp) {
                telegramWebApp.HapticFeedback.notificationOccurred('success');
            }
        }
        xpBar.style.width = `${xp}%`;

        console.log('After update:', { energy, xp, level }); // Debug log
        return true;
    }

    console.log('Not enough energy'); // Debug log
    
    // Показуємо повідомлення про нестачу енергії
    if (telegramWebApp) {
        telegramWebApp.HapticFeedback.notificationOccurred('error');
        telegramWebApp.showAlert('Not enough energy! Wait for recharge or buy energy boost.');
    }
    return false;
}

// Функція для оновлення монет
function updateCoins(amount) {
    console.log('updateCoins called:', amount); // Debug log
    coins += amount;
    coinsElement.textContent = coins;
}

// Ініціалізація гри
document.addEventListener('DOMContentLoaded', function() {
    console.log('Game initialized'); // Debug log

    try {
        // Ініціалізуємо Telegram WebApp
        if (window.Telegram) {
            console.log('Telegram WebApp available');
            telegramWebApp = window.Telegram.WebApp;
            
            if (telegramWebApp) {
                // Перевіряємо валідність даних
                if (!validateWebAppData(telegramWebApp.initData)) {
                    console.log('Invalid WebApp data, continuing without Telegram features');
                }

                // Налаштовуємо WebApp
                telegramWebApp.ready();
                telegramWebApp.expand();

                // Отримуємо дані користувача
                userData = telegramWebApp.initDataUnsafe.user;
                if (userData) {
                    document.querySelector('.user-info').textContent = 
                        `@${userData.username || 'player'}`;
                }

                // Налаштовуємо кнопку закриття
                document.getElementById('close-btn').addEventListener('click', () => {
                    telegramWebApp.close();
                });
            }
        } else {
            console.log('Telegram WebApp not available, running in standalone mode');
        }

        // Ініціалізуємо початкові значення UI
        console.log('Initializing UI elements');
        console.log('DOM Elements:', {
            xpBar: !!xpBar,
            levelText: !!levelText,
            currentEnergyText: !!currentEnergyText,
            energyFill: !!energyFill,
            coinsElement: !!coinsElement
        });

        levelText.textContent = level;
        currentEnergyText.textContent = energy;
        energyFill.style.width = '100%';
        coinsElement.textContent = coins;

    } catch (error) {
        console.error('Initialization error:', error);
    }
});

// Функція для перевірки доступності сервісів Telegram
function isTelegramAvailable() {
    return telegramWebApp && telegramWebApp.initDataUnsafe.user;
}

// Експортуємо API
window.gameAPI = {
    increaseXP,
    updateCoins,
    getEnergy: () => energy
};

// Перевіряємо чи API доступне
console.log('gameAPI available:', !!window.gameAPI);

// Debug функція для перевірки стану гри
window.debugGameState = function() {
    console.log('Current game state:', {
        xp,
        level,
        energy,
        coins,
        telegramAvailable: isTelegramAvailable(),
        apiAvailable: !!window.gameAPI,
        domElements: {
            xpBar: !!xpBar,
            levelText: !!levelText,
            currentEnergyText: !!currentEnergyText,
            energyFill: !!energyFill,
            coinsElement: !!coinsElement
        }
    });
};