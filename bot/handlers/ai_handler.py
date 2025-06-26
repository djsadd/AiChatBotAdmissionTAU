from aiogram.types import Message
from aiogram.fsm.state import StatesGroup, State
from aiogram.fsm.context import FSMContext
from aiogram import Router, types, F
import uuid

# Models

from bot.keyboards.main_menu import main_menu_ru_exit_bot, main_menu_ru
from datetime import datetime, timedelta
from bot.server.ask_groq import ask_ai
router = Router()


class ChatWithAI(StatesGroup):
    waiting_for_question = State()


@router.message(F.text == "💬 Спросить ИИ")
async def ask_ai_mode(message: types.Message, state: FSMContext):
    session_id = str(uuid.uuid4())
    await state.update_data(session_id=session_id)
    await state.set_state(ChatWithAI.waiting_for_question)

    await message.answer(
        "🤖 Вы вошли в режим общения с ИИ.\n Напишите свой вопрос.\n\nЧтобы выйти, напишите <b>выход или нажмите"
        " кнопку в панели выбора 'Выход с ИИ агента </b>.",
        parse_mode="HTML", reply_markup=main_menu_ru_exit_bot)


@router.message(ChatWithAI.waiting_for_question)
async def handle_ai_question(message: Message, state: FSMContext):
    user_data = await state.get_data()
    now = datetime.utcnow()
    session_id = user_data.get("session_id")
    last_request_time = user_data.get("last_ai_request")

    if message.text.lower() in ["выход", "💬 выход с режима ии"]:
        await state.clear()
        await message.answer("✅ Вы вышли из режима ИИ. Возвращаю главное меню.", reply_markup=main_menu_ru)
        return

    if last_request_time:
        last_request_time = datetime.fromisoformat(last_request_time)
        if now - last_request_time < timedelta(seconds=10):
            remaining = timedelta(seconds=10) - (now - last_request_time)
            seconds_left = int(remaining.total_seconds())
            await message.answer(f"⏳ Подождите {seconds_left} секунд перед следующим запросом к ИИ.")
            return

    await state.update_data(last_ai_request=now.isoformat())

    query = message.text
    await message.answer("🧠 Думаю...\n")

    response_clean = await ask_ai(query, session_id)
    await message.answer("🧠 Ответ от ИИ:\n" + response_clean + (" \nЕсли хотите выйти из режима ИИ, напишите выход или нажмите кнопку в панели"
                                        "выбора 'Выход с ИИ агента'"))
