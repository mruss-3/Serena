/**
 * Математическое ядро игры «Весовой Сапёр».
 * Значения матрицы: 0 — пустая клетка, 1 — обычная мина, 3 — тяжёлая мина.
 * Модуль не использует DOM, Canvas, Pygame или браузерные API.
 */
export class WeightMinesweeper {
  constructor({
    rows = 8, cols = 8, lightMines = 8, heavyMines = 4,
    startRow = 0, startCol = 0, mines = null
  } = {}) {
    this._validateDimensions(rows, cols);
    this.rows = rows;
    this.cols = cols;
    this.player = { row: startRow, col: startCol };
    this.gameOver = false;
    this.won = false;

    this.matrix = Array.from({ length: rows }, () => Array(cols).fill(0));
    this.opened = Array.from({ length: rows }, () => Array(cols).fill(false));
    this.flags = Array.from({ length: rows }, () => Array(cols).fill(false));

    if (mines !== null) {
      this._placeProvidedMines(mines);
    } else {
      this._placeRandomMines(lightMines, heavyMines);
    }
  }

  _validateDimensions(rows, cols) {
    if (!Number.isInteger(rows) || !Number.isInteger(cols) || rows < 2 || cols < 2) {
      throw new Error("Размеры поля должны быть не меньше 2.");
    }
  }

  _placeProvidedMines(mines) {
    for (const mine of mines) {
      this._validatePosition(mine.row, mine.col);
      if (![1, 3].includes(mine.weight)) throw new Error("Вес мины может быть только 1 или 3.");
      this.matrix[mine.row][mine.col] = mine.weight;
    }
  }

  _placeRandomMines(lightMines, heavyMines) {
    const available = [];
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        if (row !== this.player.row || col !== this.player.col) {
          available.push({ row, col });
        }
      }
    }
    for (let i = available.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [available[i], available[j]] = [available[j], available[i]];
    }
    let index = 0;
    for (let i = 0; i < lightMines; i++) this.matrix[available[index++].row][available[index++].col] = 1;
    for (let i = 0; i < heavyMines; i++) this.matrix[available[index++].row][available[index++].col] = 3;
  }

  _validatePosition(row, col, rows = this.rows, cols = this.cols) {
    if (row < 0 || row >= rows || col < 0 || col >= cols) {
      throw new Error("Координаты за пределами поля.");
    }
  }

  _inside(row, col) {
    return row >= 0 && row < this.rows && col >= 0 && col < this.cols;
  }

  static fromJSON(jsonText) {
    let config;
    try {
      config = JSON.parse(jsonText);
    } catch (error) {
      throw new Error(`Ошибка чтения JSON: ${error.message}`);
    }
    return new WeightMinesweeper(config);
  }

  // Просто двигает персонажа, НЕ взрывая его
  movePlayer(deltaRow, deltaCol) {
    if (this.gameOver) return { moved: false, reason: "game-over" };
    
    const nextRow = this.player.row + deltaRow;
    const nextCol = this.player.col + deltaCol;

    if (!this._inside(nextRow, nextCol)) {
      return { moved: false, reason: "boundary" };
    }

    this.player = { row: nextRow, col: nextCol };
    return { moved: true, hitMine: false, gameOver: false };
  }

  scan(row = this.player.row, col = this.player.col) {
    this._validatePosition(row, col);
    if (this.gameOver || this.opened[row][col]) return null;

    // Если наткнулись на мину
    if (this.matrix[row][col] > 0) {
      this.gameOver = true;
      this.won = false;
      this.opened[row][col] = true;
      return { hitMine: true, mineWeight: this.matrix[row][col], totalWeight: null };
    }

    // Если пусто — запускаем рекурсию
    this._floodOpen(row, col);

    let totalWeight = 0;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        if (this._inside(row + dr, col + dc)) {
          totalWeight += this.matrix[row + dr][col + dc];
        }
      }
    }

    return { hitMine: false, totalWeight };
  }

  // Рекурсивная функция открытия пустых клеток
  _floodOpen(row, col) {
    if (!this._inside(row, col)) return;
    if (this.opened[row][col] || this.flags[row][col]) return;
    if (this.matrix[row][col] > 0) return;

    this.opened[row][col] = true;

    let totalWeight = 0;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        if (this._inside(row + dr, col + dc)) {
          totalWeight += this.matrix[row + dr][col + dc];
        }
      }
    }

    if (totalWeight === 0) {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          this._floodOpen(row + dr, col + dc);
        }
      }
    }
  }

  toggleFlag(row = this.player.row, col = this.player.col) {
    this._validatePosition(row, col);
    if (this.gameOver || this.opened[row][col]) return false;
    this.flags[row][col] = !this.flags[row][col];
    return this.flags[row][col];
  }

  getMineCounts() {
    let light = 0, heavy = 0;
    for (const r of this.matrix) {
      for (const v of r) {
        if (v === 1) light++;
        if (v === 3) heavy++;
      }
    }
    return { light, heavy, total: light + heavy };
  }
}