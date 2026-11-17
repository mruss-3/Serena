import os
from pathlib import Path
from dotenv import load_dotenv

# Папка, в которой находится config.py
BOT_DIR = Path(__file__).resolve().parent

# Корневая папка проекта с игрой
BASE_DIR = BOT_DIR.parent

# Загружаем переменные из .env
load_dotenv(BOT_DIR / ".env")

# Получаем токен Telegram-бота
BOT_TOKEN = os.getenv("BOT_TOKEN")

# Пути к файлам игры
SAVE_FILE = BASE_DIR / "mines_save.json"
RECORDS_FILE = BASE_DIR / "mines_records.csv"

# Папка для пользовательских сессий
SESSION_DIR = BOT_DIR / "sessions"

# Создаём папку автоматически, если её ещё нет
SESSION_DIR.mkdir(exist_ok=True)