import { WeightMinesweeper } from './WeightMinesweeper.js';
import { createInput } from './input.js';
import { Renderer } from './renderer.js';
import { createScenarios } from './scenarios.js';

const ROWS = 8, COLS = 8, LIGHT = 8, HEAVY = 4, TILE = 80, STEP = 1000 / 60;

class GameWidget {
  constructor() {
    this.canvas = document.querySelector('#game');
    this.input = createInput();
    this.scans = 0;
    this.scanResults = this.emptyResults();
    this.effects = [];
    this.indicator = null;
    this.paused = false;
    this.revealAll = false;
    this.accumulator = 0;
    this.last = performance.now();
    this.cooldown = 0;
    this.game = this.newGame();
    this.game.scanResults = this.scanResults;
    this.renderer = new Renderer(this.canvas, this.game, TILE);
    this.scenarios = createScenarios(this);
    this.bindButtons();
    this.updateHud();
    this.render();
    window.addEventListener('keydown', e => this.oneShot(e));
    requestAnimationFrame(t => this.loop(t));
  }

  emptyResults() { return Array.from({ length: ROWS }, () => Array(COLS).fill(null)); }
  
  newGame() {
    const g = new WeightMinesweeper({ rows: ROWS, cols: COLS, lightMines: LIGHT, heavyMines: HEAVY, startRow: 0, startCol: 0 });
    return g;
  }

  bindButtons() {
    document.querySelectorAll('[data-scenario]').forEach(b => 
      b.addEventListener('click', () => this.scenarios[b.dataset.scenario]?.())
    );
  }

  oneShot(e) {
    const k = e.key.toLowerCase();
    if (k === 'enter' && !e.repeat) { e.preventDefault(); this.performScan(); }
    else if (k === 'f' && !e.repeat) this.toggleFlag();
    else if (k === 'r' && !e.repeat) this.restart();
    else if (k === ' ' && !e.repeat) this.scenarios.togglePause();
  }

  loop(now) {
    const delta = Math.min(now - this.last, 100);
    this.last = now;
    if (!this.paused && !this.game.gameOver) {
      this.accumulator += delta;
      while (this.accumulator >= STEP) {
        this.step();
        this.accumulator -= STEP;
      }
    }
    this.updateEffects(delta);
    this.render();
    requestAnimationFrame(t => this.loop(t));
  }

  step() {
    if (this.game.gameOver || this.paused) return;
    if (this.cooldown > 0) { this.cooldown -= STEP; return; }
    let result = false;
    if (this.input.isDown('w')) result = this.move(-1, 0);
    else if (this.input.isDown('s')) result = this.move(1, 0);
    else if (this.input.isDown('a')) result = this.move(0, -1);
    else if (this.input.isDown('d')) result = this.move(0, 1);
    if (result) this.cooldown = 115;
    this.updateHud();
  }

  move(dr, dc) {
    const r = this.game.movePlayer(dr, dc);
    if (!r.moved) return false;
    this.indicator = { age: 0 };
    this.setMessage('Нажми Enter для сканирования.');
    this.updateHud();
    return true;
  }

  performScan() {
    if (this.paused || this.game.gameOver) return;
    const { row, col } = this.game.player;
    const r = this.game.scan(row, col);
    if (!r) return;

    if (r.hitMine) {
      this.setMessage(`Обнаружена мина весом ${r.mineWeight}. GAME OVER.`);
      this.updateStatus();
      this.render(); // Обновляем картинку, чтобы показать мину
      return;
    }

    // Обновляем цифры для ВСЕХ открывшихся клеток
    for (let rIdx = 0; rIdx < ROWS; rIdx++) {
      for (let cIdx = 0; cIdx < COLS; cIdx++) {
        if (this.game.opened[rIdx][cIdx] && this.scanResults[rIdx][cIdx] === null) {
          let w = 0;
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              if (dr === 0 && dc === 0) continue;
              const nr = rIdx + dr, nc = cIdx + dc;
              if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) w += this.game.matrix[nr][nc];
            }
          }
          this.scanResults[rIdx][cIdx] = w;
        }
      }
    }

    this.scans++;
    this.effects.push({ x: (col + .5) * TILE, y: (row + .5) * TILE, radius: 4, max: 105, alpha: 1, speed: 2.2 });
    this.indicator = { age: 0 };
    this.setMessage('Сканирование завершено.');
    this.checkWin();
    this.updateHud();
    this.render();
  }

  toggleFlag() {
    if (this.paused || this.game.gameOver) return;
    const { row, col } = this.game.player;
    const flag = this.game.toggleFlag(row, col);
    this.setMessage(flag ? 'Флаг установлен.' : 'Флаг снят.');
    this.updateHud();
    this.render();
  }

  checkWin() {
    let safe = 0, opened = 0;
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      if (this.game.matrix[r][c] === 0) { safe++; if (this.game.opened[r][c]) opened++; }
    }
    if (safe === opened) {
      this.game.gameOver = true; this.game.won = true;
      this.setMessage('Победа!'); this.updateStatus();
    }
  }

  updateEffects(delta) {
    const scale = delta / STEP;
    for (const e of this.effects) {
      e.radius += e.speed * scale;
      e.alpha = Math.max(0, 1 - e.radius / e.max);
    }
    this.effects = this.effects.filter(e => e.radius < e.max);
    if (this.indicator) {
      this.indicator.age += delta;
      if (this.indicator.age > 900) this.indicator = null;
    }
  }

  restart() {
    this.game = this.newGame();
    this.scanResults = this.emptyResults();
    this.game.scanResults = this.scanResults;
    this.renderer.game = this.game;
    this.scans = 0; this.effects = []; this.indicator = null;
    this.paused = false; this.revealAll = false; this.cooldown = 0;
    this.input.clearAll();
    this.setMessage('Новая партия!'); this.updateHud(); this.render();
  }

  setMessage(s) { document.querySelector('#hud-message').textContent = s; }
  
  updateStatus() {
    const el = document.querySelector('#game-status');
    el.textContent = this.game.gameOver ? (this.game.won ? 'Победа' : 'Game Over') : (this.paused ? 'Пауза' : 'Игра');
  }

  updateHud() {
    const { row, col } = this.game.player;
    const n = this.game.getMineCounts();
    document.querySelector('#hud-row').textContent = row + 1;
    document.querySelector('#hud-col').textContent = col + 1;
    document.querySelector('#hud-scans').textContent = this.scans;
    document.querySelector('#hud-flags').textContent = this.game.flags.flat().filter(Boolean).length;
    document.querySelector('#hud-light').textContent = n.light;
    document.querySelector('#hud-heavy').textContent = n.heavy;
    this.updateStatus();
  }

  render() { this.renderer.render(this.effects, this.indicator, this.revealAll); }
}

const widget = new GameWidget();
window.WeightMinesweeperWidget = { widget, scenarios: widget.scenarios };