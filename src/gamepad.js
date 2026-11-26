// =============================================================
//  MANDO — lectura del Gamepad API (mapeo estándar Xbox/PlayStation)
//  Solo lee: qué hacer con cada botón lo decide main.js.
//  Nota: los navegadores no muestran el mando hasta que pulsas un botón.
// =============================================================
export const BTN = { A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, LT: 6, RT: 7, BACK: 8, START: 9, L3: 10, R3: 11, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 };

const PRESS = 0.4;     // umbral para gatillos analógicos
const DEAD = 0.2;      // zona muerta radial de los sticks

function dead(x, y) {
  const m = Math.hypot(x, y);
  if (m < DEAD) return [0, 0];
  const k = Math.min(1, (m - DEAD) / (1 - DEAD)) / m;
  return [x * k, y * k];
}

export function createGamepad(onConnect) {
  let idx = -1, cur = [], prev = [], axes = [0, 0, 0, 0], kind = 'xbox';
  addEventListener('gamepadconnected', e => {
    if (idx < 0) idx = e.gamepad.index;
    kind = /054c|playstation|dualsense|dualshock/i.test(e.gamepad.id) ? 'ps' : 'xbox';
    if (onConnect) onConnect(true, e.gamepad.id);
  });
  addEventListener('gamepaddisconnected', e => {
    if (e.gamepad.index !== idx) return;
    idx = -1; cur = []; prev = []; axes = [0, 0, 0, 0];
    if (onConnect) onConnect(false, e.gamepad.id);
  });

  function poll() {
    prev = cur;
    const list = navigator.getGamepads ? navigator.getGamepads() : [];
    let p = idx >= 0 ? list[idx] : null;
    if (!p) for (const q of list) if (q && q.connected) { p = q; idx = q.index; break; }
    if (!p) { cur = []; axes = [0, 0, 0, 0]; return false; }
    cur = Array.from(p.buttons, b => b.value);
    const [lx, ly] = dead(p.axes[0] || 0, p.axes[1] || 0), [rx, ry] = dead(p.axes[2] || 0, p.axes[3] || 0);
    axes = [lx, ly, rx, ry];
    return true;
  }
  const on = (arr, i) => (arr[i] || 0) > PRESS;
  return {
    poll,
    held: i => on(cur, i),
    down: i => on(cur, i) && !on(prev, i),
    up: i => !on(cur, i) && on(prev, i),
    value: i => cur[i] || 0,
    get axes() { return axes; },
    get connected() { return cur.length > 0; },
    get kind() { return kind; },
    // ¿se ha tocado algo este fotograma? (para saber qué dispositivo manda)
    touched() { return cur.some((v, i) => v > PRESS && !on(prev, i)) || axes.some(a => Math.abs(a) > 0.35); },
  };
}
