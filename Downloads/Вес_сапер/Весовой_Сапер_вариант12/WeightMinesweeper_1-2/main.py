"""Запуск игры «Весовой Сапёр», вариант 12."""

import sys
import pygame

from constants import *
from game import MinesweeperGame
from storage import (
    load_save,
    save_game,
    save_record,
    setup_logger,
)


def main():
    pygame.init()

    screen = pygame.display.set_mode(
        (WINDOW_WIDTH, WINDOW_HEIGHT)
    )

    pygame.display.set_caption(
        "Весовой Сапёр — вариант 12"
    )

    clock = pygame.time.Clock()
    logger = setup_logger()

    saved = load_save()
    game = None

    if saved:
        try:
            loaded_game = MinesweeperGame.from_dict(saved)

            if not loaded_game.game_over and not loaded_game.won:
                game = loaded_game
                logger.info("Игра загружена из сохранения")

        except (KeyError, TypeError, ValueError) as exc:
            logger.warning(
                "Не удалось загрузить сохранение: %s",
                exc,
            )

    if game is None:
        game = MinesweeperGame()
        logger.info("Начата новая игра")

    running = True

    while running:
        dt = clock.tick(FPS) / 1000

        # При завершении игры сразу показываем поле ввода имени.
        if game.game_over or game.won:
            game.awaiting_name = True

        for event in pygame.event.get():

            if event.type == pygame.QUIT:
                running = False
                continue

            if event.type == pygame.TEXTINPUT:
                if (
                    (game.game_over or game.won)
                    and game.awaiting_name
                    and len(game.input_text) < 15
                ):
                    game.input_text += event.text

                continue

            if event.type != pygame.KEYDOWN:
                continue

            if event.key == pygame.K_ESCAPE:
                running = False
                continue

            # После победы или поражения обрабатываем только имя.
            if game.game_over or game.won:

                if event.key == pygame.K_BACKSPACE:
                    game.input_text = game.input_text[:-1]

                elif event.key == pygame.K_RETURN:
                    name = game.input_text.strip() or "Игрок"

                    status = (
                        "Победа"
                        if game.won
                        else "Поражение"
                    )

                    if save_record(
                        name,
                        game.elapsed_seconds,
                        game.mines_hit,
                        status,
                    ):
                        logger.info(
                            "Результат сохранён: %s (%s)",
                            name,
                            status,
                        )
                    else:
                        logger.error(
                            "Не удалось сохранить результат"
                        )

                    game = MinesweeperGame()
                    logger.info("Начата новая игра")

                continue

            # Управление во время игры.
            if event.key in (
                pygame.K_UP,
                pygame.K_DOWN,
                pygame.K_LEFT,
                pygame.K_RIGHT,
            ):
                game.move(event.key)

            elif event.key == pygame.K_RETURN:
                game.scan()

            elif event.key == pygame.K_f:
                game.toggle_flag()

            elif event.key == pygame.K_s:
                if save_game(game.to_dict()):
                    logger.info("Игра сохранена")

        if not game.game_over and not game.won:
            game.elapsed += dt

        game.draw(screen)
        pygame.display.flip()

    pygame.quit()
    sys.exit()


if __name__ == "__main__":
    main()