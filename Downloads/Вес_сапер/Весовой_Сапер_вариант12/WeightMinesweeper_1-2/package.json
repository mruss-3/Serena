import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { WeightMinesweeper } from "./js/WeightMinesweeper.js";

let passed = 0;
async function test(name, callback) {
  try {
    await callback();
    passed++;
    console.log(`✅ ${passed}. ${name}`);
  } catch (error) {
    console.error(`❌ ${name}`);
    throw error;
  }
}

const makeGame = (mines = []) => new WeightMinesweeper({
  rows: 4, cols: 4, lightMines: 0, heavyMines: 0, mines
});

async function runTests() {
  await test("создание поля 4x4", () => assert.equal(makeGame().matrix.length, 4));
  await test("каждая строка имеет нужную длину", () => assert.equal(makeGame().matrix[0].length, 4));
  await test("стартовая позиция по умолчанию", () => assert.deepEqual(makeGame().player, { row: 0, col: 0 }));
  await test("стартовая клетка безопасна при случайной генерации", () => {
  const game = new WeightMinesweeper({ rows: 5, cols: 5, lightMines: 5, heavyMines: 3 });
  assert.equal(game.matrix[0][0], 0);
});
  await test("случайно размещается заданное число мин", () => {
  const game = new WeightMinesweeper({ rows: 5, cols: 5, lightMines: 4, heavyMines: 2 });
  assert.deepEqual(game.getMineCounts(), { light: 4, heavy: 2, total: 6 });
});
  await test("обычная мина имеет вес 1", () => assert.equal(makeGame([{row: 1, col: 1, weight: 1}]).matrix[1][1], 1));
  await test("тяжёлая мина имеет вес 3", () => assert.equal(makeGame([{row: 1, col: 1, weight: 3}]).matrix[1][1], 3));
  await test("соседняя обычная мина даёт сумму 1", () => {
  const game = makeGame([{row: 0, col: 1, weight: 1}]);
  assert.equal(game.scan(0, 0).totalWeight, 1);
});
  await test("соседняя тяжёлая мина даёт сумму 3", () => {
  const game = makeGame([{row: 0, col: 1, weight: 3}]);
  assert.equal(game.scan(0, 0).totalWeight, 3);
});
  await test("суммируются веса нескольких соседних мин", () => {
  const game = makeGame([{row: 0, col: 1, weight: 1}, {row: 1, col: 0, weight: 3}]);
  assert.equal(game.scan(0, 0).totalWeight, 4);
});
  await test("клетка после сканирования открывается", () => {
  const game = makeGame();
  game.scan(0, 0);
  assert.equal(game.opened[0][0], true);
});
  await test("сканирование не учитывает саму клетку", () => {
  const game = makeGame([{row: 1, col: 1, weight: 3}]);
  assert.equal(game.scan(1, 1).hitMine, true);
});
  await test("сканирование угловой клетки не выходит за границы", () => {
  const game = makeGame([{row: 0, col: 1, weight: 1}, {row: 1, col: 0, weight: 1}]);
  assert.equal(game.scan(0, 0).totalWeight, 2);
});
  await test("движение вправо", () => {
  const game = makeGame();
  assert.equal(game.movePlayer(0, 1).moved, true);
  assert.deepEqual(game.player, { row: 0, col: 1 });
});
  await test("движение вниз", () => {
  const game = makeGame();
  assert.equal(game.movePlayer(1, 0).moved, true);
  assert.deepEqual(game.player, { row: 1, col: 0 });
});
  await test("движение за левую границу запрещено", () => {
  const game = makeGame();
  assert.equal(game.movePlayer(0, -1).reason, "boundary");
});
  await test("движение за верхнюю границу запрещено", () => {
  const game = makeGame();
  assert.equal(game.movePlayer(-1, 0).reason, "boundary");
});
  await test("диагональное движение запрещено", () => {
  assert.equal(makeGame().movePlayer(1, 1).reason, "invalid-direction");
});
  await test("наступание на мину завершает игру", () => {
  const game = makeGame([{row: 0, col: 1, weight: 1}]);
  assert.equal(game.movePlayer(0, 1).gameOver, true);
});
  await test("после завершения игры движение запрещено", () => {
  const game = makeGame([{row: 0, col: 1, weight: 3}]);
  game.movePlayer(0, 1);
  assert.equal(game.movePlayer(1, 0).reason, "game-over");
});
  await test("флаг устанавливается", () => assert.equal(makeGame().toggleFlag(1, 1), true));
  await test("повторное нажатие снимает флаг", () => {
  const game = makeGame();
  game.toggleFlag(1, 1);
  assert.equal(game.toggleFlag(1, 1), false);
});
  await test("открытую клетку нельзя пометить флагом", () => {
  const game = makeGame();
  game.scan(1, 1);
  assert.equal(game.toggleFlag(1, 1), false);
});
  await test("getCell возвращает состояние клетки", () => {
  const game = makeGame();
  assert.equal(game.getCell(0, 0).isPlayer, true);
});
  await test("неверный размер поля вызывает ошибку", () => {
  assert.throws(() => new WeightMinesweeper({ rows: 1, cols: 4 }), /Размеры поля/);
});
  await test("отрицательное число мин вызывает ошибку", () => {
  assert.throws(() => new WeightMinesweeper({ rows: 4, cols: 4, lightMines: -1 }), /Количество мин/);
});
  await test("недопустимый вес мины вызывает ошибку", () => {
  assert.throws(() => makeGame([{row: 1, col: 1, weight: 2}]), /Вес мины/);
});
  await test("JSON-конфигурация успешно загружается", async () => {
  const json = await readFile(new URL("./config/level.json", import.meta.url), "utf8");
  const game = WeightMinesweeper.fromJSON(json);
  assert.equal(game.rows, 8);
  assert.equal(game.cols, 8);
});
  await test("ошибка JSON обрабатывается", () => {
  assert.throws(() => WeightMinesweeper.fromJSON("{bad json"), /Ошибка чтения JSON/);
});
  await test("отсутствующее поле конфигурации обнаруживается", () => {
  assert.throws(() => WeightMinesweeper.fromJSON('{"rows":4,"cols":4}'), /отсутствует обязательное поле/);
});

  console.log(`\nИТОГО: ${passed} проверок успешно пройдены.`);
}

await runTests();
