(() => {
  'use strict';

  const root = document.getElementById('oshi-chat-root');
  if (!root || root.dataset.oshiInitialized === 'true') return;
  root.dataset.oshiInitialized = 'true';
  root.classList.add('oshi-chat');

  // SOLO POC local: Azure y Foundry permanecen exclusivamente en el backend.
  const CHAT_URL = 'http://localhost:8099/chat';
  const REQUEST_TIMEOUT_MS = 180000;
  const ERROR_MESSAGE = 'No fue posible consultar OSHI en este momento. Intenta nuevamente.';

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
    const bubble = document.createElement('p');
    bubble.className = `oshi-chat__message oshi-chat__message--${role}`;
    // El contenido del usuario y del agente siempre se trata como texto.
    bubble.textContent = text;
    messages.appendChild(bubble);
    scrollToLatest();
    return bubble;
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
    input.disabled = busy;
    sendButton.disabled = busy;
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
    if (!message || isSending) return;

    addMessage('user', message);
    input.value = '';
    setBusy(true);
    const pending = addMessage('assistant', 'Consultando documentación oficial...');
    pending.classList.add('oshi-chat__message--pending');
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
    } catch (error) {
      console.error('[OSHI] Falló la consulta al backend local:', error);
      pending.textContent = ERROR_MESSAGE;
      pending.classList.add('oshi-chat__message--error');
    } finally {
      window.clearTimeout(timeout);
      pending.classList.remove('oshi-chat__message--pending');
      setBusy(false);
      scrollToLatest();
      // No quitar el foco del buscador u otro control del Portal.
      if (!panel.hidden && (root.contains(document.activeElement) || document.activeElement === document.body)) {
        input.focus({ preventScroll: true });
      }
    }
  });

  addMessage('assistant', '¡Hola! Puedo ayudarte a consultar procedimientos y documentación oficial de OSH.');
  addMessage('assistant', 'Pregúntame lo que necesites.');
  window.setTimeout(() => {
    if (!nudgeDismissed && panel.hidden) {
      nudge.hidden = false;
      window.setTimeout(dismissNudge, 7000);
    }
  }, 1200);
})();
