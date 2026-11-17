export function createInput() {
  const keys = Object.create(null);
  const controlled = new Set(['w', 'a', 's', 'd', 'enter', 'f', 'r', ' ']);

  window.addEventListener('keydown', e => {
    const k = norm(e.key);
    if (controlled.has(k)) e.preventDefault();
    keys[k] = true;
  });

  window.addEventListener('keyup', e => {
    keys[norm(e.key)] = false;
  });

  window.addEventListener('blur', () => {
    for (const k of Object.keys(keys)) keys[k] = false;
  });

  return {
    isDown: k => keys[norm(k)] === true,
    clearAll() {
      for (const k of Object.keys(keys)) keys[k] = false;
    }
  };
}

function norm(k) {
  return k === ' ' ? ' ' : k.toLowerCase();
}