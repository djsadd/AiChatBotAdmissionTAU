const axios = require('axios');

async function testAskAI() {
    try {
        const response = await axios.post('http://127.0.0.1:8000/ask_ai/', {
            query: 'В чем ваше преисущество перед другими университетами?',
            platform: 'Whatsapp'
        });

        console.log('✅ Ответ от сервера:', response.data);

    } catch (error) {
        if (error.response) {
            console.error('❌ Ответ с ошибкой от сервера:', error.response.data);
        } else {
            console.error('❌ Ошибка при запросе:', error.message);
        }
    }
}

testAskAI();
