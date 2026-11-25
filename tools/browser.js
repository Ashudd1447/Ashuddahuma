/* Drives a headless Chrome over the DevTools protocol, to try a page of the
   site the way a finger would: nothing to install (Node 22 or later has the
   WebSocket it needs; Chrome or Edge must be on the computer).

   From a script:

     const { open } = require('./browser.js');
     const page = await open('http://localhost:5000/games.html', { width: 1024, height: 768, touch: true });
     await page.eval('document.title');            // any expression; promises are awaited; the value comes back
     await page.tap(200, 300);                      // a finger (or the mouse when touch is false)
     await page.drag([[100, 400], [300, 200]], { steps: 20, ms: 16 });
     await page.key('ArrowRight');
     await page.shot('C:/somewhere/out.png');       // what the page shows now
     console.log(page.errors, page.logs);           // exceptions and console messages so far
     console.log(page.missing);                     // recordings asked for that do not exist yet (not errors)
     await page.close();

   From the command line, a picture of a page:

     node tools/browser.js shot http://localhost:5000/games.html out.png 1024 768

   The local site must be running (firebase serve --only hosting --port 5000).
   Each run uses a fresh, empty browser profile: nothing is cached and
   localStorage starts empty. Time runs as in a real browser, so wait for what
   you expect: page.wait(ms), or page.until('expression that turns true'). */
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const BROWSERS = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
];

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

async function open(url, options = {}) {
  const { width = 1024, height = 768, touch = false, scale = 1 } = options;
  const exe = options.browser || BROWSERS.find((file) => fs.existsSync(file));
  if (!exe) throw new Error('No Chrome or Edge found; pass { browser: path }');
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'ashudd-browser-'));
  const child = spawn(exe, [
    '--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check',
    '--disable-gpu', '--mute-audio', '--autoplay-policy=no-user-gesture-required', `--window-size=${width},${height}`, 'about:blank',
  ], { stdio: 'ignore' });

  /* Chrome writes the port it took into its profile folder. */
  const portFile = path.join(profile, 'DevToolsActivePort');
  let port = 0;
  for (let i = 0; i < 200 && !port; i++) {
    await sleep(50);
    /* The browser may still be writing the file: a failed read is simply tried again. */
    try {
      if (fs.existsSync(portFile)) port = Number(fs.readFileSync(portFile, 'utf8').split('\n')[0]) || 0;
    } catch { port = 0; }
  }
  if (!port) { child.kill(); throw new Error('The browser did not start'); }
  let target = null;
  for (let i = 0; i < 100 && !target; i++) {
    const list = await fetch(`http://127.0.0.1:${port}/json/list`).then((r) => r.json()).catch(() => []);
    target = list.find((t) => t.type === 'page');
    if (!target) await sleep(50);
  }
  if (!target) { child.kill(); throw new Error('The browser opened no page'); }

  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((done, fail) => { socket.onopen = done; socket.onerror = () => fail(new Error('No connection to the browser')); });
  let lastId = 0;
  const waiting = new Map();
  const listeners = [];
  const page = { errors: [], logs: [], missing: [] };
  socket.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.id && waiting.has(message.id)) {
      const { done, fail } = waiting.get(message.id);
      waiting.delete(message.id);
      if (message.error) fail(new Error(message.error.message));
      else done(message.result);
      return;
    }
    if (message.method === 'Runtime.exceptionThrown') {
      const d = message.params.exceptionDetails;
      page.errors.push(`${d.exception && d.exception.description ? d.exception.description : d.text} (${d.url || ''}:${d.lineNumber})`);
    }
    if (message.method === 'Runtime.consoleAPICalled') {
      const text = message.params.args.map((a) => (a.value !== undefined ? String(a.value) : a.description || a.type)).join(' ');
      page.logs.push(`${message.params.type}: ${text}`);
      if (message.params.type === 'error') page.errors.push(text);
    }
    if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error') {
      const { text, url: from = '' } = message.params.entry;
      /* A recording the parents have not made yet is not an error: the site stays silent for it. */
      if (/\/audio\/[^/]+\.(m4a|wav)$/.test(from)) page.missing.push(from.split('/').pop());
      else page.errors.push(`${text} (${from})`);
    }
    for (const listener of listeners.slice()) listener(message);
  };
  const send = (method, params = {}) => new Promise((done, fail) => {
    const id = ++lastId;
    waiting.set(id, { done, fail });
    socket.send(JSON.stringify({ id, method, params }));
  });
  const once = (method, ms = 15000) => new Promise((done, fail) => {
    const timer = setTimeout(() => { listeners.splice(listeners.indexOf(listener), 1); fail(new Error(`No ${method} within ${ms} ms`)); }, ms);
    const listener = (message) => {
      if (message.method !== method) return;
      clearTimeout(timer);
      listeners.splice(listeners.indexOf(listener), 1);
      done(message.params);
    };
    listeners.push(listener);
  });

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Log.enable');
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: scale, mobile: touch });
  if (touch) await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });

  page.send = send;
  page.wait = sleep;
  page.goto = async (to) => {
    const loaded = once('Page.loadEventFired', 20000);
    await send('Page.navigate', { url: to });
    await loaded;
    await sleep(150);
  };
  page.eval = async (expression) => {
    const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, userGesture: true });
    if (result.exceptionDetails) {
      const d = result.exceptionDetails;
      throw new Error(d.exception && d.exception.description ? d.exception.description : d.text);
    }
    return result.result.value;
  };
  /* Waits until the expression is true (polled), or throws after ms. */
  page.until = async (expression, ms = 8000) => {
    const end = Date.now() + ms;
    while (Date.now() < end) {
      if (await page.eval(`!!(${expression})`)) return true;
      await sleep(60);
    }
    throw new Error(`Not true within ${ms} ms: ${expression}`);
  };
  const pointer = async (kind, x, y) => {
    if (touch) {
      const type = { down: 'touchStart', move: 'touchMove', up: 'touchEnd' }[kind];
      await send('Input.dispatchTouchEvent', { type, touchPoints: kind === 'up' ? [] : [{ x, y, id: 1 }] });
    } else {
      const type = { down: 'mousePressed', move: 'mouseMoved', up: 'mouseReleased' }[kind];
      await send('Input.dispatchMouseEvent', { type, x, y, button: kind === 'move' ? 'none' : 'left', buttons: kind === 'up' ? 0 : 1, clickCount: 1 });
    }
  };
  page.down = (x, y) => pointer('down', x, y);
  page.move = (x, y) => pointer('move', x, y);
  page.up = (x, y) => pointer('up', x, y);
  page.tap = async (x, y, hold = 40) => {
    await pointer('down', x, y);
    await sleep(hold);
    await pointer('up', x, y);
    await sleep(30);
  };
  /* A finger dragged through the points, in small steps; { hold: true } leaves it down. */
  page.drag = async (points, { steps = 12, ms = 16, hold = false } = {}) => {
    await pointer('down', points[0][0], points[0][1]);
    await sleep(ms);
    for (let i = 1; i < points.length; i++) {
      const [x0, y0] = points[i - 1];
      const [x1, y1] = points[i];
      for (let s = 1; s <= steps; s++) {
        await pointer('move', x0 + ((x1 - x0) * s) / steps, y0 + ((y1 - y0) * s) / steps);
        await sleep(ms);
      }
    }
    const last = points[points.length - 1];
    if (!hold) await pointer('up', last[0], last[1]);
    await sleep(30);
  };
  page.key = async (key, hold = 40) => {
    const code = key.length === 1 ? `Key${key.toUpperCase()}` : key;
    const base = { key, code, windowsVirtualKeyCode: { ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40, Enter: 13, Escape: 27, ' ': 32 }[key] || key.toUpperCase().charCodeAt(0) };
    await send('Input.dispatchKeyEvent', { type: 'keyDown', ...base });
    await sleep(hold);
    await send('Input.dispatchKeyEvent', { type: 'keyUp', ...base });
  };
  /* The middle of an element, in page pixels: [x, y], or null when it is not there. */
  page.center = (selector) => page.eval(`(() => { const e = document.querySelector(${JSON.stringify(selector)}); if (!e) return null; const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; })()`);
  page.tapOn = async (selector) => {
    const at = await page.center(selector);
    if (!at) throw new Error(`Nothing matches ${selector}`);
    await page.tap(at[0], at[1]);
  };
  page.shot = async (file) => {
    const { data } = await send('Page.captureScreenshot', { format: 'png' });
    fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
    fs.writeFileSync(file, Buffer.from(data, 'base64'));
    return file;
  };
  page.resize = (w, h) => send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: scale, mobile: touch });
  page.close = async () => {
    try { await send('Browser.close'); } catch { /* already gone */ }
    try { socket.close(); } catch { /* already closed */ }
    await sleep(200);
    try { child.kill(); } catch { /* already gone */ }
    try { fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch { /* the browser still holds a file; the system clears its temp folder */ }
  };

  if (url) await page.goto(url);
  return page;
}

module.exports = { open, sleep };

if (require.main === module) {
  const [command, url, file, width, height] = process.argv.slice(2);
  if (command !== 'shot' || !url || !file) {
    console.log('node tools/browser.js shot <url> <file.png> [width] [height]');
    process.exit(1);
  }
  open(url, { width: Number(width) || 1024, height: Number(height) || 768 }).then(async (page) => {
    await page.wait(1200);
    await page.shot(file);
    if (page.errors.length) console.log('errors:', page.errors);
    await page.close();
    console.log('wrote', file);
  }).catch((error) => { console.error(error.message); process.exit(1); });
}
