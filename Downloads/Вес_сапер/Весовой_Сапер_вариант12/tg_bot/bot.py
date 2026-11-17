import asyncio
import logging
import io
import csv
import json
from pathlib import Path
from aiogram import Bot, Dispatcher, F
from aiogram.filters import Command, StateFilter
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.fsm.storage.memory import MemoryStorage
from aiogram.types import Message, CallbackQuery
from aiogram.exceptions import TelegramBadRequest

from config import BOT_TOKEN, RECORDS_FILE, SESSION_DIR
from session import load_session, save_session, update_session_state
from keyboards import main_menu
import analytics

logging.basicConfig(filename="bot_flight.log", level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")
logger = logging.getLogger("bot")

class BotState(StatesGroup):
    UPLOAD = State()

bot = Bot(token=BOT_TOKEN)
dp = Dispatcher(storage=MemoryStorage())

async def show_screen(chat_id: int, user_id: int, text: str, keyboard=None):
    session = load_session(user_id)
    screen_id = session.get("screen_message_id")
    screen_chat = session.get("screen_chat_id")

    if screen_id and screen_chat == chat_id:
        try:
            await bot.edit_message_text(text=text, chat_id=chat_id, message_id=screen_id, reply_markup=keyboard, parse_mode="HTML")
            return
        except TelegramBadRequest as e:
            if "message is not modified" in str(e): return
        except Exception: pass

    msg = await bot.send_message(chat_id, text, reply_markup=keyboard, parse_mode="HTML")
    session["screen_message_id"] = msg.message_id
    session["screen_chat_id"] = chat_id
    save_session(user_id, session)

@dp.message(Command("start"))
async def cmd_start(message: Message, state: FSMContext):
    await state.clear()
    update_session_state(message.from_user.id, "MENU")
    await show_screen(message.chat.id, message.from_user.id, "Выбери нужный раздел:", main_menu())

@dp.callback_query(F.data == "top")
async def process_top(callback: CallbackQuery):
    await callback.answer()
    text = analytics.get_top(analytics.parse_csv_records())
    await show_screen(callback.message.chat.id, callback.from_user.id, text, main_menu())

@dp.callback_query(F.data == "stats")
async def process_stats(callback: CallbackQuery):
    await callback.answer()
    text = analytics.get_stats()
    await show_screen(callback.message.chat.id, callback.from_user.id, text, main_menu())

# НОВОЕ: Текущая игра
@dp.callback_query(F.data == "current")
async def process_current(callback: CallbackQuery):
    await callback.answer()
    text = analytics.get_current_game()
    await show_screen(callback.message.chat.id, callback.from_user.id, text, main_menu())

@dp.callback_query(F.data == "achievements")
async def process_achievements(callback: CallbackQuery):
    await callback.answer()
    text = analytics.get_achievements()
    await show_screen(callback.message.chat.id, callback.from_user.id, text, main_menu())

# НОВОЕ: Подписка
@dp.callback_query(F.data == "subscribe")
async def process_subscribe(callback: CallbackQuery):
    await callback.answer("Подписка обновлена!")
    session = load_session(callback.from_user.id)
    sub = session.get("subscribed", False)
    session["subscribed"] = not sub
    save_session(callback.from_user.id, session)
    
    status = "включена 🔔" if session["subscribed"] else "выключена 🔕"
    text = f"Ваша подписка на новые рекорды: {status}"
    await show_screen(callback.message.chat.id, callback.from_user.id, text, main_menu())

@dp.callback_query(F.data == "upload")
async def process_upload(callback: CallbackQuery, state: FSMContext):
    await callback.answer()
    await state.set_state(BotState.UPLOAD)
    await show_screen(callback.message.chat.id, callback.from_user.id, "📁 Отправьте CSV-файл (или нажмите /start для отмены).", None)

@dp.message(StateFilter(BotState.UPLOAD), F.document)
async def handle_upload(message: Message, state: FSMContext):
    doc = message.document
    if not doc.file_name.endswith(".csv"):
        await message.answer("❌ Пожалуйста, отправьте CSV-файл.")
        return

    buffer = io.BytesIO()
    await bot.download(doc, destination=buffer)
    text = buffer.getvalue().decode("utf-8-sig")
    
    try:
        reader = csv.DictReader(io.StringIO(text))
        if not reader.fieldnames or "name" not in reader.fieldnames:
            raise ValueError("Нет колонки name")
            
        # Сохраняем файл
        with open(RECORDS_FILE, "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=["name", "time", "mines_hit", "status"])
            writer.writeheader()
            for row in reader:
                writer.writerow(row)
                
        await message.answer("✅ Файл успешно загружен и база обновлена!")
        
        # НОВОЕ: Рассылка подписчикам
        sessions = list(SESSION_DIR.glob("*.json"))
        for s_file in sessions:
            try:
                user_id = int(s_file.stem)
                s_data = load_session(user_id)
                if s_data.get("subscribed") and user_id != message.from_user.id:
                    await bot.send_message(user_id, "🔔 Обновление! В игру загружены новые рекорды. Проверь /start")
            except Exception:
                continue
                
    except Exception as e:
        await message.answer("❌ Ошибка: неверный формат CSV.")
        logger.error(f"Ошибка CSV: {e}")
        
    await state.clear()
    update_session_state(message.from_user.id, "MENU")
    await show_screen(message.chat.id, message.from_user.id, "Главное меню:", main_menu())

async def main():
    logger.info("Бот запущен!")
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())