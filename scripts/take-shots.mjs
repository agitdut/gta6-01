import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const executable = '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1148/chrome-linux/headless_shell';
const width = 1280;
const height = 720;
const port = Number(process.env.PORT_SOLANO_SHOT_PORT ?? 8765);
const origin = 'http://127.0.0.1:' + port;

function launch(executable, args, readyPattern) {
  const child = spawn(executable, args, { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
  let output = '';
  const ready = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timed out starting ' + executable + '\n' + output.trim())), 12000);
    const finish = (callback, value) => {
      clearTimeout(timeout);
      callback(value);
    };
    const read = chunk => {
      output += chunk.toString();
      const match = output.match(readyPattern);
      if (match) finish(resolve, match[0]);
    };
    child.stdout.on('data', read);
    child.stderr.on('data', read);
    child.once('error', error => finish(reject, error));
    child.once('close', (code, signal) => finish(reject, new Error(output.trim() || executable + ' exited: ' + (signal ?? code))));
  });
  return { child, ready };
}

async function stop(process) {
  const child = process?.child;
  if (!child?.pid || child.exitCode !== null || child.signalCode !== null) return;
  const exited = once(child, 'exit');
  child.kill();
  await Promise.race([exited, delay(1200, undefined, { ref: false })]);
  if (child.exitCode === null && child.signalCode === null) {
    child.kill('SIGKILL');
    await exited;
  }
}

async function connect(endpoint, errors) {
  const socket = new WebSocket(endpoint);
  const pending = new Map();
  let id = 0;
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.id) {
      pending.get(message.id)?.(message);
      return;
    }
    const p = message.params;
    if (message.method === 'Runtime.exceptionThrown') {
      errors.push(p.exceptionDetails.exception?.description ?? p.exceptionDetails.text);
    }
    if (message.method === 'Runtime.consoleAPICalled' && ['error', 'assert'].includes(p.type)) {
      errors.push(p.args.map(arg => arg.value ?? arg.description).join(' '));
    }
    if (message.method === 'Log.entryAdded' && p.entry.level === 'error') errors.push(p.entry.text);
  });
  try {
    await once(socket, 'open', { signal: AbortSignal.timeout(8000) });
  } catch (error) {
    socket.close();
    throw error;
  }
  return {
    close: () => socket.close(),
    send(method, params = {}) {
      if (socket.readyState !== WebSocket.OPEN) throw new Error('DevTools disconnected');
      const requestId = ++id;
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          pending.delete(requestId);
          reject(new Error('DevTools command timed out: ' + method));
        }, 8000);
        pending.set(requestId, response => {
          clearTimeout(timeout);
          pending.delete(requestId);
          if (response.error) reject(new Error(method + ': ' + response.error.message));
          else resolve(response.result);
        });
        socket.send(JSON.stringify({ id: requestId, method, params }));
      });
    },
  };
}

function jpegSize(data) {
  if (data.length < 4 || data.readUInt16BE(0) !== 0xffd8 || data.readUInt16BE(data.length - 2) !== 0xffd9) {
    throw new Error('Missing JPEG start or end marker');
  }
  for (let offset = 2; offset + 8 < data.length;) {
    if (data[offset++] !== 0xff) break;
    while (data[offset] === 0xff) offset++;
    const type = data[offset++];
    if (type === 0xda || type === 0xd9) break;
    const length = data.readUInt16BE(offset);
    if (length < 2 || offset + length > data.length) break;
    if ([0xc0, 0xc1, 0xc2].includes(type) && length >= 8) {
      return [data.readUInt16BE(offset + 5), data.readUInt16BE(offset + 3)];
    }
    offset += length;
  }
  throw new Error('JPEG frame header missing');
}

async function awaitFrame(client, url, errors) {
  const deadline = Date.now() + 8500;
  while (Date.now() < deadline) {
    if (errors.length) throw new Error(errors.join('\n'));
    const evaluation = await client.send('Runtime.evaluate', {
      expression: 'location.href === ' + JSON.stringify(url) + ' && window.__shotReady === true',
      returnByValue: true,
    }).catch(error => {
      if (/context/i.test(error.message)) return null;
      throw error;
    });
    if (evaluation?.result?.value === true) return;
    await delay(75);
  }
  throw new Error('Timed out waiting for window.__shotReady: ' + url);
}

async function capture() {
  const shots = JSON.parse(await readFile(join(root, 'shots.json'), 'utf8'));
  const output = join(root, 'screenshots');
  let server, browser, profile, client;
  const errors = [];
  try {
    server = launch(process.execPath, ['serve.ts', '--port', String(port)], /game\/ is on http:\/\/localhost:\d+/);
    await server.ready;
    profile = await mkdtemp('/tmp/solano-chrome-');
    browser = launch(executable, [
      '--no-sandbox', '--headless', '--disable-dev-shm-usage', '--no-first-run',
      '--remote-debugging-address=127.0.0.1', '--remote-debugging-port=0',
      '--window-size=1280,720', '--user-data-dir=' + profile, 'about:blank',
    ], /ws:\/\/127\.0\.0\.1:\d+\/devtools\/browser\/[a-f0-9-]+/);
    const endpoint = new URL(await browser.ready);
    const response = await fetch('http://' + endpoint.host + '/json/list', { signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error('DevTools target list HTTP ' + response.status);
    const page = (await response.json()).find(target => target.type === 'page');
    if (!page?.webSocketDebuggerUrl) throw new Error('DevTools did not expose a page target');
    client = await connect(page.webSocketDebuggerUrl, errors);
    for (const domain of ['Page', 'Runtime', 'Log']) await client.send(domain + '.enable');
    await client.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });

    const captures = [];
    for (const shot of shots) {
      if (!/^\d+-[a-z]+\.jpg$/.test(shot.name) || !shot.query.startsWith('?')) throw new Error('Invalid shot entry');
      const url = origin + '/' + shot.query;
      const navigation = await client.send('Page.navigate', { url });
      if (navigation.errorText) throw new Error(navigation.errorText);
      await awaitFrame(client, url, errors);
      const { data } = await client.send('Page.captureScreenshot', { format: 'jpeg', quality: 85, fromSurface: true });
      const jpeg = Buffer.from(data, 'base64');
      const [w, h] = jpegSize(jpeg);
      if (jpeg.length > 256 * 1024 || w !== width || h !== height) {
        throw new Error(shot.name + ': invalid capture size ' + w + 'x' + h + ', ' + jpeg.length + ' bytes');
      }
      captures.push({ name: shot.name, jpeg, w, h });
    }
    if (errors.length) throw new Error(errors.join('\n'));
    await mkdir(output, { recursive: true });
    for (const { name, jpeg, w, h } of captures) {
      const path = join(output, name);
      await writeFile(path, jpeg);
      const written = await readFile(path);
      if (!written.equals(jpeg)) throw new Error('Capture on disk did not match ' + name);
      console.log(name + '  ' + written.length + ' bytes  ' + w + 'x' + h);
    }
    console.log('Zero console errors or exceptions');
  } finally {
    client?.close();
    await Promise.all([stop(browser), stop(server)]);
    if (profile) await rm(profile, { recursive: true, force: true });
  }
}

await capture().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
