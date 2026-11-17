"""JSON-сохранения, CSV-рекорды и журналирование."""
import csv
import json
import logging
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
SAVE_PATH = BASE_DIR / "mines_save.json"
RECORDS_PATH = BASE_DIR / "mines_records.csv"
LOG_PATH = BASE_DIR / "minesweeper.log"


def setup_logger():
    logging.basicConfig(
        filename=LOG_PATH, level=logging.INFO,
        format="%(asctime)s | %(levelname)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    return logging.getLogger("minesweeper")


def save_game(data):
    try:
        temp = SAVE_PATH.with_suffix(".tmp")
        with temp.open("w", encoding="utf-8") as file:
            json.dump(data, file, ensure_ascii=False, indent=2)
        temp.replace(SAVE_PATH)
        return True
    except (OSError, TypeError, ValueError):
        logging.exception("Ошибка сохранения игры")
        return False


def load_save():
    if not SAVE_PATH.exists():
        return None
    try:
        with SAVE_PATH.open("r", encoding="utf-8") as file:
            data = json.load(file)
        if not isinstance(data, dict):
            raise ValueError("Ожидался JSON-объект")
        return data
    except (OSError, json.JSONDecodeError, ValueError):
        logging.exception("Не удалось прочитать сохранение")
        return None


def load_records():
    if not RECORDS_PATH.exists():
        return []
    try:
        with RECORDS_PATH.open("r", newline="", encoding="utf-8-sig") as file:
            return list(csv.DictReader(file))
    except (OSError, csv.Error):
        logging.exception("Ошибка чтения таблицы рекордов")
        return []


def save_record(name, seconds, mines_hit=0, status="Победа"):
    try:
        exists = RECORDS_PATH.exists() and RECORDS_PATH.stat().st_size > 0
        with RECORDS_PATH.open("a", newline="", encoding="utf-8-sig") as file:
            writer = csv.writer(file)
            if not exists:
                writer.writerow(["name", "time", "mines_hit", "status"])
            writer.writerow([name, round(float(seconds), 1), int(mines_hit), status])
        logging.info("Результат сохранён: %s, %.1f сек., %s", name, float(seconds), status)
        return True
    except (OSError, TypeError, ValueError):
        logging.exception("Ошибка записи результата")
        return False
