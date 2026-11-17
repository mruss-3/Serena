// Представление: отрисовка Canvas без изменения модели игры.
// Контрастная розовая тема.
export class Renderer {
  constructor(canvas, game, tile = 80) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.game = game;
    this.tile = tile;
    this.visibleRadius = tile * 3.25; // Ограниченная видимость (туман войны)

    // Единая палитра — меняйте здесь, применится везде
    this.palette = {
      bg:          '#fff0f5',   // фон поля
      fog:         '#e8ccd9',   // туман войны (заметно темнее)
      fogBorder:   '#d4a8bd',   // сетка в тумане
      tileOpen:    '#f3a6c0',   // открытая клетка (насыщенный розовый)
      tileClosed:  '#fbe0ea',   // видимая закрытая клетка
      tileBorder:  '#d98ba8',   // контур клетки (чёткий)
      text:        '#3d2030',   // основной текст (почти чёрный сливовый)
      textStrong:  '#9e1f47',   // акцентные цифры 5+
      dot:         '#9e1f47',   // точка «0»
      accent:      '#e05585',   // главный акцент (флаг, свечение)
      accentSoft:  '#f7b8cc',   // мягкий акцент
      mineSafe:    '#f3a6c0',   // мина-1
      mineDanger:  '#d61f5c',   // мина-3
      flagPole:    '#3d2030',   // древко флага
      flagCloth:   '#e05585',   // полотно флага
      player:      '#f7b8cc',   // тело игрока
      playerEye:   '#2a1520',   // глазки
      playerGlow:  'rgba(224, 85, 133, 0.9)', // свечение игрока
      wave:        [224, 85, 133], // RGB волны
      marker:      [158, 31, 71],  // RGB маркера
      overlayBg:   'rgba(255, 240, 245, 0.9)',
      win:         '#9e1f47',
      lose:        '#d61f5c',
      overlayText: '#3d2030',
    };
  }

  render(effects = [], indicator = null, revealAll = false) {
    const c = this.ctx, g = this.game, p = this.palette;
    const { rows, cols, player, opened } = g;

    c.clearRect(0, 0, this.canvas.width, this.canvas.height);
    c.fillStyle = p.bg;
    c.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const cx = (player.col + 0.5) * this.tile;
    const cy = (player.row + 0.5) * this.tile;

    for (let r = 0; r < rows; r++) {
      for (let col = 0; col < cols; col++) {
        const x = col * this.tile;
        const y = r * this.tile;
        const d = Math.hypot(x + this.tile / 2 - cx, y + this.tile / 2 - cy);
        const isVisible = revealAll || opened[r][col] || d <= this.visibleRadius;

        this.drawTile(x, y, r, col, isVisible, revealAll);
      }
    }

    for (const e of effects) {
      this.drawWave(e);
    }

    this.drawPlayer(cx, cy);
    if (indicator) {
      this.drawMarker(cx, cy, indicator);
    }

    if (g.gameOver) {
      this.drawOverlay(g.won);
    }
  }

  drawTile(x, y, r, col, visible, revealAll) {
    const c = this.ctx, g = this.game, size = this.tile - 3, v = g.matrix[r][col];
    const p = this.palette;

    // Туман — заметно темнее фона
    if (!visible) {
      c.fillStyle = p.fog;
      c.fillRect(x + 1, y + 1, size, size);
      c.strokeStyle = p.fogBorder;
      c.lineWidth = 1.5;
      c.strokeRect(x + 1, y + 1, size, size);
      return;
    }

    // Открытая клетка — насыщенный розовый; закрытая видимая — светлый
    c.fillStyle = g.opened[r][col] ? p.tileOpen : p.tileClosed;
    c.fillRect(x + 1, y + 1, size, size);

    // Чёткий контур
    c.strokeStyle = p.tileBorder;
    c.lineWidth = 1.5;
    c.strokeRect(x + 1, y + 1, size, size);

    if (g.opened[r][col]) {
      const n = g.scanResults?.[r]?.[col];

      if (typeof n === 'number') {
        if (n > 0) {
          // Цифра с тенью для читаемости на розовом
          c.save();
          c.shadowColor = 'rgba(255, 255, 255, 0.6)';
          c.shadowBlur = 4;
          c.fillStyle = n < 5 ? p.text : p.textStrong;
          c.font = 'bold 26px "Segoe UI", Arial';
          c.textAlign = 'center';
          c.textBaseline = 'middle';
          c.fillText(String(n), x + this.tile / 2, y + this.tile / 2);
          c.restore();
        } else {
          // Точка «0» — контрастный акцент
          c.fillStyle = p.dot;
          c.beginPath();
          c.arc(x + this.tile / 2, y + this.tile / 2, 3.5, 0, Math.PI * 2);
          c.fill();
        }
      }
    } else if (g.flags[r][col]) {
      this.drawFlag(x + this.tile / 2, y + this.tile / 2);
    } else if (revealAll && v > 0) {
      // Мины при «Показать всё»
      const isDanger = v === 3;
      c.save();
      c.shadowColor = isDanger ? 'rgba(214, 31, 92, 0.6)' : 'rgba(224, 85, 133, 0.5)';
      c.shadowBlur = 12;
      c.fillStyle = isDanger ? p.mineDanger : p.mineSafe;
      c.beginPath();
      c.arc(x + this.tile / 2, y + this.tile / 2, isDanger ? 14 : 10, 0, Math.PI * 2);
      c.fill();
      c.restore();

      c.fillStyle = '#fffafc';
      c.font = 'bold 12px "Segoe UI", Arial';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(String(v), x + this.tile / 2, y + this.tile / 2 + 1);
    }
  }

  drawFlag(x, y) {
    const c = this.ctx, p = this.palette;
    c.strokeStyle = p.flagPole;
    c.lineWidth = 3;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(x - 7, y + 13);
    c.lineTo(x - 7, y - 13);
    c.stroke();

    c.fillStyle = p.flagCloth;
    c.beginPath();
    c.moveTo(x - 6, y - 12);
    c.lineTo(x + 12, y - 6);
    c.lineTo(x - 6, y + 1);
    c.closePath();
    c.fill();
  }

  drawPlayer(x, y) {
    const c = this.ctx, p = this.palette;
    c.save();
    c.shadowColor = p.playerGlow;
    c.shadowBlur = 18;
    c.fillStyle = p.player;
    c.beginPath();
    c.arc(x, y, 18, 0, Math.PI * 2);
    c.fill();

    c.shadowBlur = 0;
    c.fillStyle = p.playerEye;
    c.beginPath();
    c.arc(x - 6, y - 3, 2.5, 0, Math.PI * 2);
    c.arc(x + 6, y - 3, 2.5, 0, Math.PI * 2);
    c.fill();
    c.restore();
  }

  drawWave(e) {
    const c = this.ctx, p = this.palette;
    const [r, g, b] = p.wave;
    c.strokeStyle = `rgba(${r}, ${g}, ${b}, ${e.alpha.toFixed(3)})`;
    c.lineWidth = 3;
    c.beginPath();
    c.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
    c.stroke();
  }

  drawMarker(x, y, i) {
    const c = this.ctx, p = this.palette;
    const [r, g, b] = p.marker;
    const scale = 1 + Math.sin(i.age * 0.018) * 0.12;
    const alpha = Math.max(0.15, 1 - i.age / 900);
    c.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
    c.beginPath();
    c.arc(x, y - 31, 7 * scale, 0, Math.PI * 2);
    c.fill();
  }

  drawOverlay(won) {
    const c = this.ctx, p = this.palette;
    c.fillStyle = p.overlayBg;
    c.fillRect(0, 0, this.canvas.width, this.canvas.height);

    c.textAlign = 'center';
    c.fillStyle = won ? p.win : p.lose;
    c.font = 'bold 42px "Segoe UI", Arial';
    c.fillText(won ? 'ПОБЕДА!' : 'GAME OVER', 320, 310);

    c.fillStyle = p.overlayText;
    c.font = '18px "Segoe UI", Arial';
    c.fillText('Нажми R или кнопку «Новая игра»', 320, 352);
  }
}