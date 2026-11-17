from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton

def main_menu() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="🏆 Топ игроков", callback_data="top")],
            [InlineKeyboardButton(text="📊 Моя статистика", callback_data="stats")],
            [InlineKeyboardButton(text="💾 Текущая игра", callback_data="current")],
            [InlineKeyboardButton(text="🎖 Достижения", callback_data="achievements")],
            [InlineKeyboardButton(text="🔔 Подписаться на рекорды", callback_data="subscribe")],
            [InlineKeyboardButton(text="📁 Загрузить CSV", callback_data="upload")]
        ]
    )