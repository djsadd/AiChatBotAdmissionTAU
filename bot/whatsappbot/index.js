const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

const RATE_LIMIT_MS = 10000; // 10 секунд
const UUID_UPDATE_INTERVAL = 60 * 60 * 1000; // 1 час
const MESSAGE_LIMIT = 5; // каждые 5 сообщений

const lastRequestTime = {};
const userData = {}; // { номер: { uuid, lastUpdated, messageCount } }

client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('✅ Бот подключен и готов!');
});

client.on('message', async message => {
    const sender = message.from;
    const now = Date.now();

    if (sender.endsWith('@g.us')) return; // Игнорируем группы

    // Инициализация данных пользователя
    if (!userData[sender]) {
        userData[sender] = {
            uuid: uuidv4(),
            lastUpdated: now,
            messageCount: 0
        };
    }

    const user = userData[sender];

    // Обновление UUID при необходимости
    const shouldUpdateUUID =
        now - user.lastUpdated >= UUID_UPDATE_INTERVAL || user.messageCount >= MESSAGE_LIMIT;

    if (shouldUpdateUUID) {
        user.uuid = uuidv4();
        user.lastUpdated = now;
        user.messageCount = 0;
        console.log(`🔄 Новый UUID для ${sender}: ${user.uuid}`);
    }

    // Проверка лимита по времени
    if (lastRequestTime[sender] && (now - lastRequestTime[sender]) < RATE_LIMIT_MS) {
        const remaining = ((RATE_LIMIT_MS - (now - lastRequestTime[sender])) / 1000).toFixed(1);
        await message.reply(`⏱ Пожалуйста, подождите ещё ${remaining} секунд перед следующим запросом.`);
        return;
    }

    // Обновляем состояние
    lastRequestTime[sender] = now;
    user.messageCount += 1;

    console.log(`📨 ${sender}: ${message.body} (UUID: ${user.uuid})`);

    try {
        const response = await axios.post('http://127.0.0.1:8000/ask_ai/', {
            query: message.body,
            platform: 'Whatsapp',
            uuid: user.uuid
        });

        const aiReply = response.data.answer;
        await message.reply(`🤖 ${aiReply}`);
    } catch (error) {
        console.error('❌ Ошибка при запросе к FastAPI:', error.message);
        await message.reply('⚠️ Произошла ошибка при обращении к ИИ-серверу. Попробуйте позже.');
    }
});

client.initialize();
