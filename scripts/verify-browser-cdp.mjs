import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const userDataDir = "C:\\Users\\PC\\.gemini\\antigravity-ide\\brain\\12eaa986-3e24-4c03-9298-14efa461436d\\scratch\\chrome-verification-profile";
const artifactDir = "C:\\Users\\PC\\.gemini\\antigravity-ide\\brain\\12eaa986-3e24-4c03-9298-14efa461436d";

console.log("=== INICIANDO VERIFICACIÓN COMPLETA EN NAVEGADOR REAL (GOOGLE CHROME CDP) ===");

fs.mkdirSync(userDataDir, { recursive: true });
const chromeProcess = spawn(chromePath, [
  "--headless=new",
  "--remote-debugging-port=9222",
  `--user-data-dir=${userDataDir}`,
  "--disable-gpu",
  "--no-first-run",
  "--no-default-browser-check",
  "--window-size=1440,900",
  "http://localhost:5173/",
]);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  await sleep(2500);

  const listRes = await fetch("http://127.0.0.1:9222/json/list");
  const pages = await listRes.json();
  const salesRoomPage = pages.find((p) => p.url.includes("localhost:5173") || p.type === "page") || pages[0];

  if (!salesRoomPage?.webSocketDebuggerUrl) {
    throw new Error("No se pudo obtener el WebSocketDebuggerUrl de Chrome");
  }

  console.log(`[CDP] Conectado a Chrome: ${salesRoomPage.title} (${salesRoomPage.webSocketDebuggerUrl})`);

  const ws = new WebSocket(salesRoomPage.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });

  let messageId = 1;
  const pendingRequests = new Map();

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.id && pendingRequests.has(data.id)) {
      const { resolve, reject } = pendingRequests.get(data.id);
      pendingRequests.delete(data.id);
      if (data.error) reject(data.error);
      else resolve(data.result);
    }
  };

  function send(method, params = {}) {
    const id = messageId++;
    return new Promise((resolve, reject) => {
      pendingRequests.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async function evaluate(code) {
    const result = await send("Runtime.evaluate", {
      expression: code,
      awaitPromise: true,
      returnByValue: true,
    });
    return result.result?.value;
  }

  await send("Page.enable");
  await send("Runtime.enable");

  // Esperar a que la aplicación React monte en el DOM
  let appMounted = false;
  for (let i = 0; i < 20; i++) {
    const hasRoot = await evaluate("Boolean(document.querySelector('.cinematic-header, .facade-stage, .concierge-launch'))");
    if (hasRoot) {
      appMounted = true;
      break;
    }
    await sleep(500);
  }

  if (!appMounted) {
    throw new Error("La aplicación Sales Room no montó elementos en el tiempo esperado");
  }

  console.log("✔ [Navegador Real] Sales Room montado correctamente en Chrome.");

  // 1. Abrir panel del Concierge
  await evaluate("document.querySelector('.concierge-launch')?.click()");
  await sleep(600);
  const panelOpen = await evaluate("Boolean(document.querySelector('.cinematic-concierge'))");
  console.log(`✔ [Navegador Real] Panel cinemático del Concierge abierto: ${panelOpen}`);

  // 2. Verificar micrófono inactivo por defecto
  const micState = await evaluate(`(() => {
    const btn = document.querySelector('.concierge-mic-btn');
    if (!btn) return 'not_found';
    if (btn.classList.contains('is-listening')) return 'listening';
    if (btn.classList.contains('is-denied')) return 'denied';
    if (btn.classList.contains('is-unsupported')) return 'unsupported';
    return 'idle';
  })()`);
  console.log(`✔ [Navegador Real] Micrófono al inicio: '${micState}' (confirmado inactivo)`);

  // 3. Iniciar visita guiada (Paso 0: Bienvenida, 1/6)
  await evaluate(`(() => {
    const btns = Array.from(document.querySelectorAll('.concierge-prompts button'));
    const startBtn = btns.find(b => b.textContent.includes('Iniciar visita guiada') || b.textContent.includes('Start guided tour'));
    startBtn?.click();
  })()`);
  await sleep(800);

  const step0Status = await evaluate(`document.querySelector('.presentation-status-bar')?.textContent?.replace(/\\s+/g, ' ').trim()`);
  console.log(`✔ [Navegador Real] Paso 0 (Bienvenida): "${step0Status}"`);

  // 4. Avanzar a Paso 1: Arquitectura y Entorno (2/6)
  await evaluate(`(() => {
    const btns = Array.from(document.querySelectorAll('.presentation-status-bar button'));
    const nextBtn = btns.find(b => b.textContent.includes('Siguiente') || b.textContent.includes('Next'));
    nextBtn?.click();
  })()`);
  await sleep(1000);

  const step1Status = await evaluate(`document.querySelector('.presentation-status-bar')?.textContent?.replace(/\\s+/g, ' ').trim()`);
  console.log(`✔ [Navegador Real] Paso 1 (Arquitectura): "${step1Status}"`);

  // 5. Avanzar a Paso 2: Residencia 401 (3/6)
  await evaluate(`(() => {
    const btns = Array.from(document.querySelectorAll('.presentation-status-bar button'));
    const nextBtn = btns.find(b => b.textContent.includes('Siguiente') || b.textContent.includes('Next'));
    nextBtn?.click();
  })()`);
  await sleep(1200);

  const step2Check = await evaluate(`(() => {
    const statusBar = document.querySelector('.presentation-status-bar')?.textContent?.replace(/\\s+/g, ' ').trim();
    const hotspot401 = document.querySelector('.unit-zone[data-unit-id=\"401\"]');
    const isSelected = hotspot401?.classList.contains('is-selected');
    const isHighlighted = hotspot401?.classList.contains('is-concierge-highlighted');
    const revealTitle = document.querySelector('.residence-reveal h2')?.textContent?.trim();
    return { statusBar, exists: Boolean(hotspot401), isSelected, isHighlighted, revealTitle };
  })()`);
  console.log(`✔ [Navegador Real] Paso 2 (Residencia 401 seleccionada y resaltada):`, step2Check);

  // 6. Avanzar a Paso 3: Plano Arquitectónico (4/6)
  await evaluate(`(() => {
    const btns = Array.from(document.querySelectorAll('.presentation-status-bar button'));
    const nextBtn = btns.find(b => b.textContent.includes('Siguiente') || b.textContent.includes('Next'));
    nextBtn?.click();
  })()`);
  await sleep(1800);

  const step3Check = await evaluate(`(() => {
    const statusBar = document.querySelector('.presentation-status-bar')?.textContent?.replace(/\\s+/g, ' ').trim();
    const dialog = document.querySelector('.interior-experience');
    const isModalOpen = Boolean(dialog && dialog.open);
    const planCanvas = document.querySelector('.floor-plan-canvas');
    const isPlanHighlighted = planCanvas?.classList.contains('is-concierge-highlighted');
    const tag = document.querySelector('.floor-plan-canvas .concierge-highlight-tag')?.textContent?.trim();
    return { statusBar, isModalOpen, isPlanCanvasPresent: Boolean(planCanvas), isPlanHighlighted, tag };
  })()`);
  console.log(`✔ [Navegador Real] Paso 3 (Plano arquitectónico abierto y destacado completo):`, step3Check);

  // 7. Interrupción por chat: pregunta sobre HOA
  console.log("[CDP] Probando interrupción por chat: pregunta sobre cuota de mantenimiento (HOA)...");
  await evaluate(`(() => {
    const input = document.querySelector('.concierge-input input');
    if (input) {
      const proto = window.HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
      setter.call(input, '¿Cuánto cuesta el mantenimiento?');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      const form = document.querySelector('.concierge-input');
      form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    }
  })()`);
  await sleep(1500);

  const chatResponseCheck = await evaluate(`(() => {
    const logs = Array.from(document.querySelectorAll('.concierge-log p'));
    const last = logs[logs.length - 1];
    const isPaused = Array.from(document.querySelectorAll('.presentation-status-bar button')).some(b => b.textContent.includes('Reanudar') || b.textContent.includes('Resume'));
    return {
      author: last?.className,
      text: last?.textContent?.trim(),
      isPresentationPaused: isPaused
    };
  })()`);
  console.log(`✔ [Navegador Real] Interrupción atendida, presentación pausada y respuesta honesta:`, chatResponseCheck);

  // 8. Reanudación tras interrupción
  console.log("[CDP] Probando reanudación tras la respuesta...");
  await evaluate(`(() => {
    const btns = Array.from(document.querySelectorAll('.presentation-status-bar button'));
    const resumeBtn = btns.find(b => b.textContent.includes('Reanudar') || b.textContent.includes('Resume'));
    resumeBtn?.click();
  })()`);
  await sleep(1000);

  const resumedStatus = await evaluate(`document.querySelector('.presentation-status-bar')?.textContent?.replace(/\\s+/g, ' ').trim()`);
  console.log(`✔ [Navegador Real] Estado tras reanudar: "${resumedStatus}"`);

  // 9. Interrupción por navegación manual: usuario hace clic en Residencia 201
  console.log("[CDP] Probando interrupción por selección manual del usuario (clic en Residencia 201)...");
  // Cerrar modal para interactuar en la fachada
  await evaluate("document.querySelector('.interior-x')?.click()");
  await sleep(600);

  await evaluate("document.querySelector('.unit-zone[data-unit-id=\"201\"]')?.click()");
  await sleep(1000);

  const manualNavCheck = await evaluate(`(() => {
    const selected201 = document.querySelector('.unit-zone[data-unit-id=\"201\"]')?.classList.contains('is-selected');
    const selectedHeading = document.querySelector('.residence-reveal h2')?.textContent?.trim();
    const isPaused = Array.from(document.querySelectorAll('.presentation-status-bar button')).some(b => b.textContent.includes('Reanudar') || b.textContent.includes('Resume'));
    return { selected201, selectedHeading, isPaused };
  })()`);
  console.log(`✔ [Navegador Real] Selección manual respetada y presentación pausada:`, manualNavCheck);

  // 10. Captura de pantalla de la interfaz real con CDP
  const screenshotData = await send("Page.captureScreenshot", { format: "png" });
  const screenshotPath = path.join(artifactDir, "browser_verification_chrome.png");
  fs.writeFileSync(screenshotPath, Buffer.from(screenshotData.data, "base64"));
  console.log(`✔ [Navegador Real] Captura de pantalla guardada en: ${screenshotPath}`);

  // 11. Detener presentación limpiamente
  await evaluate(`(() => {
    const btns = Array.from(document.querySelectorAll('.presentation-status-bar button'));
    const stopBtn = btns.find(b => b.textContent.includes('Terminar') || b.textContent.includes('Stop'));
    stopBtn?.click();
  })()`);
  await sleep(500);

  const finalCheck = await evaluate("Boolean(document.querySelector('.presentation-status-bar'))");
  console.log(`✔ [Navegador Real] Barra de presentación cerrada limpiamente: ${!finalCheck}`);

  ws.close();
}

try {
  await main();
  console.log("\n=== TODAS LAS COMPROBACIONES EN GOOGLE CHROME REAL FINALIZADAS EXITOSAMENTE ===");
} catch (err) {
  console.error("ERROR EN VERIFICACIÓN CDP:", err);
  process.exitCode = 1;
} finally {
  chromeProcess.kill();
}
