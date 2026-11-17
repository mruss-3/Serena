import csv
import json
from config import RECORDS_FILE, SAVE_FILE

def parse_csv_records() -> list[dict]:
    if not RECORDS_FILE.exists():
        return []
    records = []
    try:
        with open(RECORDS_FILE, "r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            for row in reader:
                try:
                    records.append({
                        "name": row.get("name", "Игрок"),
                        "time": float(row.get("time", 0)),
                        "mines_hit": int(row.get("mines_hit", 0)),
                        "status": row.get("status", "Неизвестно")
                    })
                except (ValueError, TypeError):
                    continue
    except OSError:
        return []
    return records

def get_current_game() -> str:
    """Читает mines_save.json (требование варианта 12)."""
    if not SAVE_FILE.exists():
        return "💾 Сохранённой игры нет."
    try:
        with open(SAVE_FILE, "r", encoding="utf-8") as f:
            save = json.load(f)
        
        player = save.get("player", [0, 0])
        opened = save.get("opened", [])
        flags = save.get("flags", [])
        
        # Считаем количество открытых клеток и флагов
        opened_count = sum(1 for row in opened for cell in row if cell)
        flags_count = sum(1 for row in flags for cell in row if cell)

        return (
            f"💾 <b>Текущая игра (сохранение):</b>\n\n"
            f"📍 Позиция игрока: {player}\n"
            f"🔓 Открыто клеток: {opened_count}\n"
            f"🚩 Флагов установлено: {flags_count}"
        )
    except Exception:
        return "❌ Ошибка чтения сохранения."

def get_top(records: list[dict], limit: int = 5) -> str:
    wins = [r for r in records if r["status"] == "Победа"]
    wins.sort(key=lambda r: r["time"])
    if not wins:
        return "🏆 Побед пока нет."
    lines = ["🏆 <b>ТОП ПОБЕД (по времени):</b>\n"]
    for i, r in enumerate(wins[:limit], 1):
        lines.append(f"{i}. {r['name']} — <b>{r['time']:.1f}</b> сек.")
    return "\n".join(lines)

def get_stats() -> str:
    records = parse_csv_records()
    if not records:
        return "📊 Пока нет записей."
    total = len(records)
    wins = len([r for r in records if r["status"] == "Победа"])
    losses = len([r for r in records if r["status"] == "Поражение"])
    return f"📊 <b>Общая статистика:</b>\n\nВсего игр: {total}\nПобед: {wins}\nПоражений: {losses}"

def get_achievements() -> str:
    records = parse_csv_records()
    if not records:
        return "🎖 Нет данных для достижений."
    wins = [r for r in records if r["status"] == "Победа"]
    has_speedrun = any(r["time"] < 60 for r in wins)
    has_clean_win = any(r["mines_hit"] == 0 for r in wins)
    
    lines = ["🎖 <b>Достижения:</b>\n"]
    lines.append("✅ Скороход (победа < 60 сек)" if has_speedrun else "❌ Скороход")
    lines.append("✅ Чистая победа (ни одного взрыва)" if has_clean_win else "❌ Чистая победа")
    return "\n".join(lines)