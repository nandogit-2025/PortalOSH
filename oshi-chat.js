(() => {
  'use strict';

  const root = document.getElementById('oshi-chat-root');
  if (!root || root.dataset.oshiInitialized === 'true') return;
  root.dataset.oshiInitialized = 'true';
  root.classList.add('oshi-chat');

  function resolveChatUrl() {
    const configured = window.OSHI_CONFIG?.chatUrl;
    if (typeof configured === 'string' && configured.trim()) {
      try {
        const url = new URL(configured.trim());
        // La configuración publicada requiere HTTPS y no transporta credenciales.
        if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash
          || url.hostname === 'localhost' || url.hostname.endsWith('.localhost')
          || url.hostname.startsWith('127.') || url.hostname === '[::1]') return null;
        return url.href;
      } catch {
        return null;
      }
    }
    // Solo las pruebas HTTP locales/LAN y file:// conservan el backend del PC.
    if (window.location.protocol === 'file:') return 'http://localhost:8099/chat';
    if (window.location.protocol !== 'http:') return null;
    const url = new URL('http://localhost:8099/chat');
    url.hostname = window.location.hostname;
    return url.href;
  }

  const CHAT_URL = resolveChatUrl();
  const REQUEST_TIMEOUT_MS = 180000;
  const ERROR_MESSAGE = 'No fue posible consultar OSHI en este momento. Intenta nuevamente.';
  const WAIT_MESSAGE = 'Claro, dame un momento mientras reviso la documentación de OSH.';
  const WAIT_LONG_MESSAGE = 'Sigo con tu consulta. Gracias por esperar.';

  root.innerHTML = `
    <button class="oshi-chat__nudge" type="button" hidden>
      ¿Necesitas ayuda? ¡Chatea conmigo! 💬
    </button>
    <section class="oshi-chat__panel" id="oshi-chat-panel"
      role="dialog" aria-labelledby="oshi-chat-title" hidden>
      <header class="oshi-chat__header">
        <div>
          <h2 id="oshi-chat-title">¡Hola! 👋</h2>
          <p>Soy OSHI, tu asistente IA de OSH. Estoy aquí para ayudarte.</p>
        </div>
        <button class="oshi-chat__close" type="button" aria-label="Cerrar chat de OSHI">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>
        </button>
      </header>
      <div class="oshi-chat__messages" role="log" aria-live="polite"
        aria-relevant="additions text" aria-label="Mensajes con OSHI"></div>
      <form class="oshi-chat__composer">
        <label class="oshi-chat__sr-only" for="oshi-chat-input">Mensaje para OSHI</label>
        <textarea id="oshi-chat-input" name="message" rows="2"
          placeholder="Escribe tu mensaje..." required></textarea>
        <button class="oshi-chat__send" type="submit" aria-label="Enviar mensaje">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m22 2-7 20-4-9-9-4 20-7ZM22 2 11 13"/></svg>
        </button>
      </form>
    </section>
    <button class="oshi-chat__launcher" type="button" aria-label="Abrir chat de OSHI"
      aria-controls="oshi-chat-panel" aria-expanded="false">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M21 11.5a8.5 8.5 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.7a8.5 8.5 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.5 8.5 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z"/>
        <path d="M8 12h.01M12 12h.01M16 12h.01"/>
      </svg>
    </button>`;

  const panel = root.querySelector('.oshi-chat__panel');
  const launcher = root.querySelector('.oshi-chat__launcher');
  const nudge = root.querySelector('.oshi-chat__nudge');
  const closeButton = root.querySelector('.oshi-chat__close');
  const messages = root.querySelector('.oshi-chat__messages');
  const form = root.querySelector('.oshi-chat__composer');
  const input = root.querySelector('#oshi-chat-input');
  const sendButton = root.querySelector('.oshi-chat__send');
  let isSending = false;
  let nudgeDismissed = false;

  function scrollToLatest() {
    messages.scrollTop = messages.scrollHeight;
  }

  function addMessage(role, text) {
    const bubble = document.createElement('div');
    bubble.className = `oshi-chat__message oshi-chat__message--${role}`;
    // El contenido del usuario y del agente siempre se trata como texto.
    bubble.textContent = text;
    messages.appendChild(bubble);
    scrollToLatest();
    return bubble;
  }

  function appendSources(bubble, data) {
    const list = document.createElement('div');
    list.className = 'oshi-chat__sources';
    const seen = new Set();
    const sources = Array.isArray(data.sources) ? data.sources.slice(0, 8) : [];
    for (const source of sources) {
      if (!source || typeof source.url !== 'string' || typeof source.title !== 'string') continue;
      let url;
      try {
        url = new URL(source.url);
        if (url.protocol !== 'https:' || url.hostname !== 'oshgetsemani.sharepoint.com'
          || url.port || url.username || url.password || url.hash
          || !/\.(pdf|docx?|xlsx?|pptx?|csv)$/i.test(url.pathname)
          || [...url.searchParams].some(([key, value]) => key !== 'web' || !['0', '1'].includes(value))) continue;
      } catch {
        continue;
      }
      const key = url.origin + url.pathname;
      if (seen.has(key)) continue;
      seen.add(key);
      const link = document.createElement('a');
      link.className = 'oshi-chat__source';
      link.href = url.href;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.setAttribute('aria-label', `Abrir documento: ${source.title}`);
      const title = document.createElement('span');
      title.className = 'oshi-chat__source-title';
      title.textContent = source.title;
      const action = document.createElement('span');
      action.className = 'oshi-chat__source-action';
      action.textContent = 'Abrir documento ↗';
      link.append(title, action);
      list.appendChild(link);
    }
    if (list.children.length) bubble.appendChild(list);
    if (data.sources_unavailable === true) {
      const note = document.createElement('p');
      note.className = 'oshi-chat__source-note';
      note.textContent = 'No hay un enlace verificado disponible para alguno de los documentos citados.';
      bubble.appendChild(note);
    }
  }

  function dismissNudge() {
    nudgeDismissed = true;
    nudge.hidden = true;
  }

  function setOpen(open) {
    panel.hidden = !open;
    launcher.setAttribute('aria-expanded', String(open));
    launcher.setAttribute('aria-label', open ? 'Cerrar chat de OSHI' : 'Abrir chat de OSHI');
    dismissNudge();
    if (open) {
      scrollToLatest();
      if (!isSending) input.focus({ preventScroll: true });
    } else {
      launcher.focus({ preventScroll: true });
    }
  }

  function setBusy(busy) {
    isSending = busy;
    input.disabled = busy || !CHAT_URL;
    sendButton.disabled = busy || !CHAT_URL;
    messages.setAttribute('aria-busy', String(busy));
  }

  launcher.addEventListener('click', () => setOpen(panel.hidden));
  nudge.addEventListener('click', () => setOpen(true));
  closeButton.addEventListener('click', () => setOpen(false));
  root.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !panel.hidden) {
      event.preventDefault();
      setOpen(false);
    }
  });
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      if (!isSending) form.requestSubmit();
    }
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const message = input.value.trim();
    if (!message || isSending || !CHAT_URL) return;

    const startedAt = performance.now();
    let completed = false;
    let responseId = null;
    addMessage('user', message);
    input.value = '';
    setBusy(true);
    const pending = addMessage('assistant', '');
    pending.classList.add('oshi-chat__message--pending');
    const pendingText = document.createElement('span');
    pendingText.textContent = WAIT_MESSAGE;
    const elapsed = document.createElement('span');
    elapsed.className = 'oshi-chat__elapsed';
    elapsed.setAttribute('aria-hidden', 'true');
    pending.append(pendingText, elapsed);
    const updateWait = () => {
      const seconds = Math.floor((performance.now() - startedAt) / 1000);
      elapsed.textContent = `Tiempo de espera: ${seconds} s`;
      if (seconds >= 30 && pendingText.textContent !== WAIT_LONG_MESSAGE) {
        pendingText.textContent = WAIT_LONG_MESSAGE;
      }
    };
    updateWait();
    scrollToLatest();
    const waitTimer = window.setInterval(updateWait, 1000);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(CHAT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({ message }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`OSHI devolvió HTTP ${response.status}`);
      const data = await response.json();
      if (typeof data.answer !== 'string' || !data.answer.trim()) {
        throw new Error('OSHI no devolvió una respuesta de texto válida');
      }
      pending.textContent = data.answer;
      appendSources(pending, data);
      completed = true;
      if (typeof data.response_id === 'string') responseId = data.response_id;
    } catch (error) {
      console.error('[OSHI] Falló la consulta al backend:', error);
      pending.textContent = ERROR_MESSAGE;
      pending.classList.add('oshi-chat__message--error');
    } finally {
      window.clearTimeout(timeout);
      window.clearInterval(waitTimer);
      pending.classList.remove('oshi-chat__message--pending');
      const durationMs = Math.round(performance.now() - startedAt);
      pending.dataset.durationMs = String(durationMs);
      const timing = document.createElement('span');
      timing.className = 'oshi-chat__timing';
      const seconds = (durationMs / 1000).toLocaleString('es-CO', {
        minimumFractionDigits: 1, maximumFractionDigits: 1,
      });
      timing.textContent = `${completed ? 'Respuesta en' : 'Tiempo de espera:'} ${seconds} s`;
      pending.appendChild(timing);
      console.info('[OSHI] Consulta finalizada', {
        duration_ms: durationMs, completed, response_id: responseId,
      });
      setBusy(false);
      scrollToLatest();
      // No quitar el foco del buscador u otro control del Portal.
      if (!panel.hidden && (root.contains(document.activeElement) || document.activeElement === document.body)) {
        input.focus({ preventScroll: true });
      }
    }
  });

  if (CHAT_URL) {
    addMessage('assistant', '¡Hola! Puedo ayudarte a consultar procedimientos y documentación oficial de OSH.');
    addMessage('assistant', 'Pregúntame lo que necesites.');
  } else {
    addMessage('assistant', 'OSHI no está disponible en este momento.');
    input.placeholder = 'Chat no disponible';
  }
  setBusy(false);
  window.setTimeout(() => {
    if (!nudgeDismissed && panel.hidden) {
      nudge.hidden = false;
      window.setTimeout(dismissNudge, 7000);
    }
  }, 1200);
})();
