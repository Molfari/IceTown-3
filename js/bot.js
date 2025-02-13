// bot.js
const TelegramBot = require('node-telegram-bot-api');
const crypto = require('crypto');

// Константи
const BOT_TOKEN = '7618848302:AAGn-pGhIgyk82VpXUyTw5aiIzQkXArYq5c';
const WEB_APP_URL = 'https://molfari.github.io/IceTown-4/';

// екземпляр бота
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

//  команда /start
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const keyboard = {
        keyboard: [[{
            text: '🎮 Play Ice Town',
            web_app: { url: WEB_APP_URL }
        }]],
        resize_keyboard: true
    };

    await bot.sendMessage(chatId, 
        'Welcome to Ice Town! 🎮❄️\n\n' +
        'Capture frozen buildings, earn gold, and compete with other players!\n\n' +
        'Click the button below to start playing:', 
        { reply_markup: keyboard }
    );
});

//  команда /help
bot.onText(/\/help/, async (msg) => {
    const chatId = msg.chat.id;
    const helpText = 
        '❄️ *Ice Town Help* ❄️\n\n' +
        '*Game Rules:*\n' +
        '1. Tap frozen buildings to capture them\n' +
        '2. Each tap costs 1 Energy\n' +
        '3. Captured buildings earn you Gold\n' +
        '4. Collect XP to level up\n\n' +
        '*Commands:*\n' +
        '/start - Start the game\n' +
        '/help - Show this help message\n\n' +
        '*Need more help?*\n' +
        'Contact @support_username';

    await bot.sendMessage(chatId, helpText, { parse_mode: 'Markdown' });
});

// Функція для валідації даних від WebApp
function validateWebAppData(initData) {
    try {
        //  initData
        const urlParams = new URLSearchParams(initData);
        const hash = urlParams.get('hash');
        urlParams.delete('hash');

        // параметри
        const params = Array.from(urlParams.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, value]) => `${key}=${value}`)
            .join('\n');

        // HMAC
        const secret = crypto.createHmac('sha256', 'WebAppData')
            .update(BOT_TOKEN)
            .digest();

        const calculatedHash = crypto.createHmac('sha256', secret)
            .update(params)
            .digest('hex');

        return calculatedHash === hash;
    } catch (error) {
        console.error('WebApp validation error:', error);
        return false;
    }
}

// Експортуємо функції для використання в веб-додатку
module.exports = {
    validateWebAppData
};