import json
from config import SESSION_DIR

def get_session_path(user_id: int):
    return SESSION_DIR / f"{user_id}.json"

def load_session(user_id: int) -> dict:
    """Загружает сессию. Добавляем поле fsm_state по умолчанию."""
    path = get_session_path(user_id)
    if not path.exists():
        return {
            "screen_message_id": None,
            "screen_chat_id": None,
            "fsm_state": "MENU"
        }
    try:
        with open(path, "r", encoding="utf-8") as file:
            data = json.load(file)
            # Если файл старый и там нет fsm_state, добавляем
            if "fsm_state" not in data:
                data["fsm_state"] = "MENU"
            return data
    except (OSError, json.JSONDecodeError):
        return {
            "screen_message_id": None,
            "screen_chat_id": None,
            "fsm_state": "MENU"
        }

def save_session(user_id: int, data: dict) -> None:
    path = get_session_path(user_id)
    with open(path, "w", encoding="utf-8") as file:
        json.dump(data, file, ensure_ascii=False, indent=2)

def update_session_state(user_id: int, state_name: str):
    """Обновляет только состояние в JSON-сессии."""
    data = load_session(user_id)
    data["fsm_state"] = state_name
    save_session(user_id, data)