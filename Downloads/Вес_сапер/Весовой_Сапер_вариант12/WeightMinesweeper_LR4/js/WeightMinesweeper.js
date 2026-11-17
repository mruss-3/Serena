/**
 * Математическое ядро игры «Весовой Сапёр».
 * Значения матрицы: 0 — пустая клетка, 1 — обычная мина, 3 — тяжёлая мина.
 * Модуль не использует DOM, Canvas, Pygame или браузерные API.
 */
export class WeightMinesweeper {
  constructor({
    rows = 8,
    cols = 8,
    lightMines = 8,
    heavyMines = 4,
    startRow = 0,
    startCol = 0,
    mines = null
  } = {}) {
    this._validateDimensions(rows, cols);
    this._validateMineCounts(rows, cols, lightMines, heavyMines);
    this._validatePosition(startRow, startCol, rows, cols);

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
      throw new Error("Размеры поля rows и cols должны быть целыми числами не меньше 2.");
    }
  }

  _validateMineCounts(rows, cols, lightMines, heavyMines) {
    if (!Number.isInteger(lightMines) || !Number.isInteger(heavyMines) ||
        lightMines < 0 || heavyMines < 0) {
      throw new Error("Количество мин каждого типа должно быть неотрицательным целым числом.");
    }
    if (lightMines + heavyMines >= rows * cols) {
      throw new Error("Количество мин должно быть меньше количества клеток.");
    }
  }

  _validatePosition(row, col, rows = this.rows, cols = this.cols) {
    if (!Number.isInteger(row) || !Number.isInteger(col) ||
        row < 0 || row >= rows || col < 0 || col >= cols) {
      throw new Error("Координаты находятся за пределами игрового поля.");
    }
  }

  _placeProvidedMines(mines) {
    if (!Array.isArray(mines)) {
      throw new Error("Список mines должен быть массивом координат.");
    }
    for (const mine of mines) {
      if (!mine || !Number.isInteger(mine.row) || !Number.isInteger(mine.col)) {
        throw new Error("Каждая мина должна содержать целые row и col.");
      }
      this._validatePosition(mine.row, mine.col);
      if (![1, 3].includes(mine.weight)) {
        throw new Error("Вес мины может быть только 1 или 3.");
      }
      if (this.matrix[mine.row][mine.col] !== 0) {
        throw new Error("В одной клетке не может находиться несколько мин.");
      }
      if (mine.row === this.player.row && mine.col === this.player.col) {
        throw new Error("Стартовая клетка игрока должна быть безопасной.");
      }
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

    // Перемешивание Фишера — Йетса.
    for (let i = available.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [available[i], available[j]] = [available[j], available[i]];
    }

    let index = 0;
    for (let i = 0; i < lightMines; i++) {
      const cell = available[index++];
      this.matrix[cell.row][cell.col] = 1;
    }
    for (let i = 0; i < heavyMines; i++) {
      const cell = available[index++];
      this.matrix[cell.row][cell.col] = 3;
    }
  }

  static fromJSON(jsonText) {
    let config;
    try {
      config = JSON.parse(jsonText);
    } catch (error) {
      throw new Error(`Ошибка чтения JSON: ${error.message}`);
    }

    if (!config || typeof config !== "object" || Array.isArray(config)) {
      throw new Error("Конфигурация должна быть JSON-объектом.");
    }

    const required = ["rows", "cols", "lightMines", "heavyMines"];
    for (const field of required) {
      if (!(field in config)) {
        throw new Error(`В конфигурации отсутствует обязательное поле: ${field}`);
      }
    }

    return new WeightMinesweeper({
      rows: config.rows,
      cols: config.cols,
      lightMines: config.lightMines,
      heavyMines: config.heavyMines,
      startRow: config.startRow ?? 0,
      startCol: config.startCol ?? 0
    });
  }

  movePlayer(deltaRow, deltaCol) {
    if (this.gameOver) return { moved: false, reason: "game-over" };
    if (!Number.isInteger(deltaRow) || !Number.isInteger(deltaCol) ||
        Math.abs(deltaRow) + Math.abs(deltaCol) !== 1) {
      return { moved: false, reason: "invalid-direction" };
    }

    const nextRow = this.player.row + deltaRow;
    const nextCol = this.player.col + deltaCol;

    if (nextRow < 0 || nextRow >= this.rows || nextCol < 0 || nextCol >= this.cols) {
      return { moved: false, reason: "boundary" };
    }

    this.player = { row: nextRow, col: nextCol };
    const weight = this.matrix[nextRow][nextCol];

    if (weight === 1 || weight === 3) {
      this.gameOver = true;
      this.won = false;
      return { moved: true, hitMine: true, mineWeight: weight, gameOver: true };
    }

    return { moved: true, hitMine: false, gameOver: false };
  }

  scan(row = this.player.row, col = this.player.col) {
    this._validatePosition(row, col);
    if (this.gameOver) return null;

    if (this.matrix[row][col] === 1 || this.matrix[row][col] === 3) {
      this.gameOver = true;
      this.won = false;
      return { hitMine: true, mineWeight: this.matrix[row][col], totalWeight: null };
    }

    let totalWeight = 0;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const neighborRow = row + dr;
        const neighborCol = col + dc;
        if (this._inside(neighborRow, neighborCol)) {
          totalWeight += this.matrix[neighborRow][neighborCol];
        }
      }
    }

    this.opened[row][col] = true;
    return { hitMine: false, totalWeight };
  }

  toggleFlag(row = this.player.row, col = this.player.col) {
    this._validatePosition(row, col);
    if (this.gameOver || this.opened[row][col]) return false;
    this.flags[row][col] = !this.flags[row][col];
    return this.flags[row][col];
  }

  _inside(row, col) {
    return row >= 0 && row < this.rows && col >= 0 && col < this.cols;
  }

  getCell(row, col) {
    this._validatePosition(row, col);
    return {
      mineWeight: this.matrix[row][col],
      opened: this.opened[row][col],
      flagged: this.flags[row][col],
      isPlayer: row === this.player.row && col === this.player.col
    };
  }

  getMineCounts() {
    let light = 0;
    let heavy = 0;
    for (const row of this.matrix) {
      for (const value of row) {
        if (value === 1) light++;
        if (value === 3) heavy++;
      }
    }
    return { light, heavy, total: light + heavy };
  }

  getPublicState() {
    return {
      rows: this.rows,
      cols: this.cols,
      player: { ...this.player },
      opened: this.opened.map(row => [...row]),
      flags: this.flags.map(row => [...row]),
      gameOver: this.gameOver,
      won: this.won
    };
  }
}
