import random
import pygame
from constants import *


class MinesweeperGame:
    def __init__(self):
        self.mines = [[0 for _ in range(COLS)] for _ in range(ROWS)]
        self.opened = [[False for _ in range(COLS)] for _ in range(ROWS)]
        self.flags = [[False for _ in range(COLS)] for _ in range(ROWS)]
        self.player = [0, 0]
        self.game_over = False
        self.won = False
        self.mines_hit = 0
        self.elapsed = 0.0
        self.awaiting_name = False
        self.input_text = ""
        self.font = pygame.font.Font(None, 28)
        self.small = pygame.font.Font(None, 22)
        self.title_font = pygame.font.Font(None, 36)
        self._generate_mines()

    @property
    def elapsed_seconds(self):
        return self.elapsed

    def _generate_mines(self):
        cells = [(r, c) for r in range(ROWS) for c in range(COLS) if (r, c) != (0, 0)]
        for r, c in random.sample(cells, min(MINE_COUNT, len(cells))):
            self.mines[r][c] = random.choice((1, 3))

    def scan_weight(self, row, col):
        total = 0
        for dr in (-1, 0, 1):
            for dc in (-1, 0, 1):
                if dr == 0 and dc == 0:
                    continue
                nr, nc = row + dr, col + dc
                if 0 <= nr < ROWS and 0 <= nc < COLS:
                    total += self.mines[nr][nc]
        return total

    def move(self, key):
        if self.game_over or self.won:
            return
        moves = {
            pygame.K_UP: (-1, 0),
            pygame.K_DOWN: (1, 0),
            pygame.K_LEFT: (0, -1),
            pygame.K_RIGHT: (0, 1),
        }
        if key not in moves:
            return
        dr, dc = moves[key]
        nr, nc = self.player[0] + dr, self.player[1] + dc
        if 0 <= nr < ROWS and 0 <= nc < COLS:
            self.player = [nr, nc]

    def _flood_open(self, r, c):
        if not (0 <= r < ROWS and 0 <= c < COLS):
            return
        if self.opened[r][c] or self.flags[r][c] or self.mines[r][c] > 0:
            return
        self.opened[r][c] = True
        if self.scan_weight(r, c) == 0:
            for dr in (-1, 0, 1):
                for dc in (-1, 0, 1):
                    if dr != 0 or dc != 0:
                        self._flood_open(r + dr, c + dc)
    

    def toggle_flag(self):
        if self.game_over or self.won:
            return
        r, c = self.player
        if not self.opened[r][c]:
            self.flags[r][c] = not self.flags[r][c]

    def _all_safe_opened(self):
        return all(
            self.mines[r][c] > 0 or self.opened[r][c]
            for r in range(ROWS) for c in range(COLS)
        )
    def scan(self):
            if self.game_over or self.won:
                return False
            r, c = self.player
            if self.opened[r][c] or self.flags[r][c]:
                return False
            if self.mines[r][c] > 0:
                self.opened[r][c] = True
                self.game_over = True
                self.mines_hit += 1
                return True
            self._flood_open(r, c)
            if self._all_safe_opened():
                self.won = True
            return False

    def to_dict(self):
        return {
            "mines": self.mines, "opened": self.opened, "flags": self.flags,
            "player": self.player, "game_over": self.game_over, "won": self.won,
            "mines_hit": self.mines_hit, "elapsed": self.elapsed,
        }

    @classmethod
    def from_dict(cls, data):
        game = cls.__new__(cls)
        game.font = pygame.font.Font(None, 28)
        game.small = pygame.font.Font(None, 22)
        game.title_font = pygame.font.Font(None, 36)
        game.mines = data["mines"]
        game.opened = data["opened"]
        game.flags = data["flags"]
        game.player = data["player"]
        game.game_over = bool(data.get("game_over", False))
        game.won = bool(data.get("won", False))
        game.mines_hit = int(data.get("mines_hit", 0))
        game.elapsed = float(data.get("elapsed", 0.0))
        game.awaiting_name = False
        game.input_text = ""
        for matrix in (game.mines, game.opened, game.flags):
            if len(matrix) != ROWS or any(len(row) != COLS for row in matrix):
                raise ValueError("Неверный размер игрового поля в сохранении")
        if (not isinstance(game.player, list) or len(game.player) != 2
                or not all(isinstance(v, int) for v in game.player)
                or not (0 <= game.player[0] < ROWS and 0 <= game.player[1] < COLS)):
            raise ValueError("Некорректная позиция игрока в сохранении")
        return game

    def draw(self, screen):
        screen.fill(BG)
        title = self.title_font.render("ВЕСОВОЙ САПЁР — САПЁР-РАЗВЕДЧИК", True, ACCENT)
        screen.blit(title, (28, 22))
        status = self.font.render(
            f"Время: {self.elapsed:5.1f} сек.   Мины: {MINE_COUNT}   Вес мин: 1 или 3",
            True, TEXT
        )
        screen.blit(status, (28, 60))

        for r in range(ROWS):
            for c in range(COLS):
                x = GRID_X + c * CELL_SIZE
                y = GRID_Y + r * CELL_SIZE
                rect = pygame.Rect(x, y, CELL_SIZE, CELL_SIZE)
                pygame.draw.rect(screen, OPEN if self.opened[r][c] else HIDDEN, rect)
                pygame.draw.rect(screen, GRID, rect, 2)

                if self.opened[r][c]:
                    if self.mines[r][c] > 0:
                        pygame.draw.circle(screen, (225, 60, 65), rect.center, 10)
                    else:
                        weight = self.scan_weight(r, c)
                        if weight > 0:
                            color = (30, 80, 170) if weight < 5 else (190, 55, 55)
                            label = self.font.render(str(weight), True, color)
                            screen.blit(label, label.get_rect(center=rect.center))
                        else:
                            dot = self.small.render("·", True, (90, 110, 120))
                            screen.blit(dot, (x + 19, y + 13))

                if self.flags[r][c]:
                    pygame.draw.polygon(
                        screen, FLAG,
                        [(x + 14, y + 10), (x + 34, y + 17), (x + 14, y + 25)]
                    )
                    pygame.draw.line(screen, TEXT, (x + 14, y + 10), (x + 14, y + 38), 2)

                if self.mines[r][c] > 0 and (self.game_over or self.won):
                    pygame.draw.circle(screen, (225, 60, 65), rect.center, 10)
                    pygame.draw.circle(screen, (255, 220, 220), rect.center, 3)

                if self.player == [r, c] and not (self.game_over or self.won):
                    pygame.draw.rect(screen, PLAYER, rect.inflate(-4, -4), 3, border_radius=4)
                    pygame.draw.circle(screen, PLAYER, (x + 8, y + 8), 4)

        help_y = GRID_Y + ROWS * CELL_SIZE + 12
        help_text = self.small.render(
            "Стрелки — выбрать | Enter — проверить | F — флаг | S — сохранить | Esc — выход",
            True, TEXT
        )
        screen.blit(help_text, (28, help_y))

        if self.game_over or self.won:
            overlay = pygame.Surface((WINDOW_WIDTH, WINDOW_HEIGHT), pygame.SRCALPHA)
            overlay.fill((0, 0, 0, 220))
            screen.blit(overlay, (0, 0))
            if self.game_over:
                message, message_color = "ПОРАЖЕНИЕ! Вы попали на мину", (255, 100, 100)
            else:
                message, message_color = "ПОБЕДА! Все безопасные клетки открыты", ACCENT

            message_surface = self.title_font.render(message, True, message_color)
            screen.blit(message_surface, message_surface.get_rect(
                center=(WINDOW_WIDTH // 2, WINDOW_HEIGHT // 2 - 90)
            ))
            prompt = self.font.render("Введите имя для таблицы результатов:", True, TEXT)
            screen.blit(prompt, prompt.get_rect(
                center=(WINDOW_WIDTH // 2, WINDOW_HEIGHT // 2 - 35)
            ))
            input_rect = pygame.Rect(WINDOW_WIDTH // 2 - 150, WINDOW_HEIGHT // 2 - 5, 300, 45)
            pygame.draw.rect(screen, (50, 60, 70), input_rect)
            pygame.draw.rect(screen, ACCENT, input_rect, 2)
            name_surface = self.font.render(self.input_text + "_", True, TEXT)
            screen.blit(name_surface, (input_rect.x + 10, input_rect.y + 10))
            hint = self.small.render(
                "Enter — сохранить результат и начать новую игру", True, TEXT
            )
            screen.blit(hint, hint.get_rect(
                center=(WINDOW_WIDTH // 2, WINDOW_HEIGHT // 2 + 65)
            ))
