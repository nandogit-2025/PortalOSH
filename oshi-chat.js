(() => {
  'use strict';

  const root = document.getElementById('oshi-chat-root');
  if (!root || root.dataset.oshiInitialized === 'true') return;
  root.dataset.oshiInitialized = 'true';
  root.classList.add('oshi-chat');

  const useLocalBackend = window.OSHI_CONFIG?.useLocalBackendOnHttp === true
    && ['http:', 'file:'].includes(window.location.protocol);

  function resolveChatUrl() {
    if (useLocalBackend) {
      const url = new URL('http://localhost:8099/chat');
      if (window.location.protocol === 'http:') url.hostname = window.location.hostname;
      return url.href;
    }
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
  const requiresAccessCode = window.OSHI_CONFIG?.requiresAccessCode === true && !useLocalBackend;
  const REQUEST_TIMEOUT_MS = 180000;
  const ERROR_MESSAGE = 'No fue posible consultar OSHI en este momento. Intenta nuevamente.';
  const WAIT_MESSAGE = 'Claro, dame un momento mientras reviso la documentación de OSH.';
  const WAIT_LONG_MESSAGE = 'Sigo con tu consulta. Gracias por esperar.';
  const START_TOPICS = Object.freeze({
    faq: {
      placeholder: '¿Qué te gustaría saber? También puedes escribir otra pregunta.',
    },
    documents: {
      placeholder: '¿Qué procedimiento o documento necesitas consultar?',
      questions: [
        '¿Cómo hago un arqueo de caja?',
        'Necesito activar un código de Simphony',
        '¿Cuál es el procedimiento para configurar una tablet de habitación?',
      ],
    },
  });

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
      <form class="oshi-chat__access" hidden>
        <label for="oshi-access-code">Código de prueba</label>
        <div class="oshi-chat__access-row">
          <input id="oshi-access-code" type="password" autocomplete="off" required
            placeholder="Introduce tu código" aria-describedby="oshi-access-status">
          <button type="submit">Conectar</button>
        </div>
        <p id="oshi-access-status" role="status">Solicita el código al responsable de la prueba.</p>
      </form>
      <div class="oshi-chat__messages" role="log" aria-live="polite"
        aria-relevant="additions text" aria-label="Mensajes con OSHI">
        <section class="oshi-chat__welcome" id="oshi-start-menu" aria-labelledby="oshi-start-title" hidden>
          <h3 id="oshi-start-title">¿Sobre qué te gustaría consultar?</h3>
          <p>Elige una opción para empezar o escribe tu pregunta directamente.</p>
          <div class="oshi-chat__topics">
            <button class="oshi-chat__topic" type="button" data-topic="faq"
              aria-pressed="false" aria-controls="oshi-start-examples">
              <span class="oshi-chat__topic-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24"><path d="M8.5 9a3.5 3.5 0 0 1 7 .5c0 2-3.5 2-3.5 4M12 17h.01"/><circle cx="12" cy="12" r="9"/></svg>
              </span>
              <span><strong>Preguntas frecuentes</strong><small>Vacaciones, beneficios, permisos y más</small></span>
              <span class="oshi-chat__topic-arrow" aria-hidden="true">›</span>
            </button>
            <button class="oshi-chat__topic" type="button" data-topic="documents"
              aria-pressed="false" aria-controls="oshi-start-examples">
              <span class="oshi-chat__topic-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9ZM14 3v6h6M8 13h8M8 17h5"/></svg>
              </span>
              <span><strong>Procedimientos y documentos</strong><small>Pasos, instructivos y formatos de OSH</small></span>
              <span class="oshi-chat__topic-arrow" aria-hidden="true">›</span>
            </button>
          </div>
          <div class="oshi-chat__examples" id="oshi-start-examples" hidden>
            <nav class="oshi-chat__menu-path" aria-label="Recorrido de preguntas frecuentes" hidden></nav>
            <p class="oshi-chat__examples-title">Puedes empezar con una de estas preguntas:</p>
            <button class="oshi-chat__menu-back" type="button" hidden>← Volver</button>
            <div class="oshi-chat__questions"></div>
            <p class="oshi-chat__examples-note">Toca un ejemplo para escribirlo abajo. Puedes editarlo antes de enviar.</p>
          </div>
        </section>
      </div>
      <div class="oshi-chat__browse" hidden>
        <button class="oshi-chat__browse-button" type="button" aria-controls="oshi-start-menu">
          <span aria-hidden="true">↖</span> Ver temas y preguntas
        </button>
      </div>
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
  const accessForm = root.querySelector('.oshi-chat__access');
  const accessInput = root.querySelector('#oshi-access-code');
  const accessButton = accessForm.querySelector('button');
  const accessStatus = root.querySelector('#oshi-access-status');
  const welcome = root.querySelector('.oshi-chat__welcome');
  const browse = root.querySelector('.oshi-chat__browse');
  const browseButton = root.querySelector('.oshi-chat__browse-button');
  const topicButtons = [...root.querySelectorAll('.oshi-chat__topic')];
  const examples = root.querySelector('.oshi-chat__examples');
  const questions = root.querySelector('.oshi-chat__questions');
  const menuPath = root.querySelector('.oshi-chat__menu-path');
  const menuTitle = root.querySelector('.oshi-chat__examples-title');
  const menuBack = root.querySelector('.oshi-chat__menu-back');
  const menuNote = root.querySelector('.oshi-chat__examples-note');
  let accessCode = '';
  let isSending = false;
  let nudgeDismissed = false;
  let conversationStarted = false;
  let faqMenu = null;
  let menuLoading = null;
  let selectedTopic = null;
  let axisIndex = -1;
  let programIndex = -1;
  let navigationEpoch = 0;

  function menuButton(label, action, className = 'oshi-chat__menu-choice') {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = className;
    button.textContent = label;
    button.disabled = isSending;
    button.addEventListener('click', () => {
      if (!input.disabled) action();
    });
    return button;
  }

  function showStart() {
    selectedTopic = null;
    navigationEpoch++;
    examples.hidden = true;
    examples.setAttribute('aria-busy', 'false');
    topicButtons.forEach(button => button.setAttribute('aria-pressed', 'false'));
    input.placeholder = 'Escribe tu mensaje...';
    messages.scrollTop = 0;
  }

  function showQuestions(items) {
    for (const question of items) {
      const button = menuButton(question, () => {
        input.value = question;
        input.focus({ preventScroll: true });
      }, 'oshi-chat__question');
      button.setAttribute('aria-label', `Usar pregunta: ${question}`);
      questions.appendChild(button);
    }
    menuNote.textContent = 'Elige una pregunta para escribirla abajo. Puedes editarla antes de enviar.';
  }

  function renderFaqMenu() {
    questions.replaceChildren();
    menuPath.replaceChildren();
    menuPath.hidden = false;
    menuBack.hidden = false;
    menuPath.appendChild(menuButton('Temas', showStart, 'oshi-chat__menu-crumb'));
    menuPath.appendChild(menuButton('Preguntas frecuentes', () => {
      axisIndex = -1;
      programIndex = -1;
      renderFaqMenu();
    }, 'oshi-chat__menu-crumb'));
    const axis = faqMenu.axes[axisIndex];
    const program = axis?.programs[programIndex];
    if (axis) {
      menuPath.appendChild(menuButton(axis.label, () => {
        programIndex = axis.programs.length === 1 ? 0 : -1;
        renderFaqMenu();
      }, 'oshi-chat__menu-crumb'));
    }
    if (program && program.label !== axis.label) {
      const label = document.createElement('span');
      label.textContent = program.label;
      label.setAttribute('aria-current', 'step');
      menuPath.appendChild(label);
    }
    if (program) {
      menuTitle.textContent = `¿Qué deseas saber sobre ${program.label}?`;
      showQuestions(program.questions);
    } else if (axis) {
      menuTitle.textContent = '¿Qué tema deseas consultar?';
      axis.programs.forEach((program, index) => questions.appendChild(menuButton(program.label, () => {
        programIndex = index;
        renderFaqMenu();
      })));
      menuNote.textContent = 'Elige un programa o escribe tu pregunta directamente.';
    } else {
      menuTitle.textContent = '¿Sobre qué deseas preguntar?';
      faqMenu.axes.forEach((axis, index) => questions.appendChild(menuButton(axis.label, () => {
        axisIndex = index;
        programIndex = axis.programs.length === 1 ? 0 : -1;
        renderFaqMenu();
      })));
      menuNote.textContent = 'Elige un tema o escribe tu pregunta directamente.';
    }
    examples.scrollIntoView({ block: 'start' });
  }

  async function loadFaqMenu() {
    if (faqMenu) return faqMenu;
    if (!menuLoading) {
      menuLoading = (async () => {
        const controller = new AbortController();
        const timeout = window.setTimeout(() => controller.abort(), 15000);
        try {
          const response = await fetch(new URL('./faq/menu', CHAT_URL).href, {
            headers: requiresAccessCode ? {'X-OSHI-Access-Code': accessCode} : {},
            credentials: 'omit', cache: 'no-store', signal: controller.signal,
          });
          if (!response.ok) throw new Error('Menu unavailable');
          const data = await response.json();
          if (!Array.isArray(data.axes) || !data.axes.length || !data.axes.every(axis =>
            typeof axis.label === 'string' && Array.isArray(axis.programs) && axis.programs.length &&
            axis.programs.every(program => typeof program.label === 'string' &&
              Array.isArray(program.questions) && program.questions.length &&
              program.questions.every(question => typeof question === 'string' && question.trim())))) {
            throw new Error('Invalid menu');
          }
          faqMenu = data;
          return data;
        } finally {
          window.clearTimeout(timeout);
          menuLoading = null;
        }
      })();
    }
    return menuLoading;
  }

  async function chooseTopic(topic) {
    const config = START_TOPICS[topic];
    if (!config || input.disabled) return;
    selectedTopic = topic;
    const epoch = ++navigationEpoch;
    topicButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.topic === topic)));
    questions.replaceChildren();
    menuPath.hidden = true;
    menuBack.hidden = true;
    examples.hidden = false;
    input.placeholder = config.placeholder;
    if (topic === 'documents') {
      examples.setAttribute('aria-busy', 'false');
      menuTitle.textContent = 'Puedes empezar con una de estas preguntas:';
      showQuestions(config.questions);
    } else {
      menuTitle.textContent = 'Cargando temas…';
      menuNote.textContent = 'También puedes escribir tu pregunta directamente.';
      examples.setAttribute('aria-busy', 'true');
      try {
        await loadFaqMenu();
        if (epoch !== navigationEpoch || selectedTopic !== 'faq') return;
        renderFaqMenu();
      } catch {
        if (epoch !== navigationEpoch || selectedTopic !== 'faq') return;
        menuTitle.textContent = 'No se pudo cargar el menú. Puedes escribir tu pregunta.';
        questions.appendChild(menuButton('Volver a cargar temas', () => chooseTopic('faq')));
      } finally {
        if (epoch === navigationEpoch) examples.setAttribute('aria-busy', 'false');
      }
    }
    if (epoch === navigationEpoch) examples.scrollIntoView({ block: 'start' });
  }

  topicButtons.forEach(button => button.addEventListener('click', () => chooseTopic(button.dataset.topic)));
  menuBack.addEventListener('click', () => {
    if (input.disabled) return;
    if (programIndex >= 0 && faqMenu.axes[axisIndex].programs.length > 1) programIndex = -1;
    else if (axisIndex >= 0) { axisIndex = -1; programIndex = -1; }
    else { showStart(); return; }
    renderFaqMenu();
  });
  browseButton.addEventListener('click', () => {
    if (browseButton.disabled) return;
    messages.scrollTop = 0;
    const selected = topicButtons.find(button => button.getAttribute('aria-pressed') === 'true');
    (selected || topicButtons[0]).focus({ preventScroll: true });
    // Volver a las opciones conserva los mensajes y el borrador.
  });

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
      if (conversationStarted) scrollToLatest();
      if (requiresAccessCode && !accessCode && CHAT_URL) accessInput.focus({ preventScroll: true });
      else if (!isSending) input.focus({ preventScroll: true });
    } else {
      launcher.focus({ preventScroll: true });
    }
  }

  function setBusy(busy) {
    isSending = busy;
    const locked = requiresAccessCode && !accessCode;
    input.disabled = busy || !CHAT_URL || locked;
    sendButton.disabled = busy || !CHAT_URL || locked;
    topicButtons.forEach(button => { button.disabled = busy || !CHAT_URL || locked; });
    root.querySelectorAll('.oshi-chat__menu-choice, .oshi-chat__question, .oshi-chat__menu-crumb, .oshi-chat__menu-back')
      .forEach(button => { button.disabled = busy || !CHAT_URL || locked; });
    welcome.hidden = !CHAT_URL || locked;
    browse.hidden = !conversationStarted || !CHAT_URL || locked;
    browseButton.disabled = busy || !CHAT_URL || locked;
    messages.setAttribute('aria-busy', String(busy));
  }

  accessForm.hidden = !CHAT_URL || !requiresAccessCode;
  accessForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const candidate = accessInput.value.trim();
    if (!candidate || !CHAT_URL || accessButton.disabled) return;
    accessInput.disabled = true;
    accessButton.disabled = true;
    accessStatus.textContent = 'Comprobando acceso…';
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(new URL('./session', CHAT_URL).href, {
        headers: {'X-OSHI-Access-Code': candidate}, signal: controller.signal,
        credentials: 'omit', cache: 'no-store',
      });
      if (response.status === 401) {
        accessStatus.textContent = 'Código incorrecto. Verifica el código e inténtalo otra vez.';
      } else if (response.status === 403) {
        accessStatus.textContent = 'Esta red no está habilitada para la prueba.';
      } else if (!response.ok) {
        accessStatus.textContent = 'No fue posible conectar. Inténtalo de nuevo.';
      } else {
        accessCode = candidate;
        accessForm.hidden = true;
        input.placeholder = 'Escribe tu mensaje...';
        setBusy(false);
        input.focus({preventScroll:true});
      }
    } catch {
      accessStatus.textContent = 'No fue posible conectar. Inténtalo de nuevo.';
    } finally {
      window.clearTimeout(timeout);
      accessInput.value = '';
      accessInput.disabled = false;
      accessButton.disabled = false;
    }
  });

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
    if (!message || isSending || !CHAT_URL || (requiresAccessCode && !accessCode)) return;

    const startedAt = performance.now();
    let completed = false;
    let responseId = null;
    conversationStarted = true;
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
        headers: { 'Content-Type': 'application/json; charset=utf-8',
          ...(requiresAccessCode ? {'X-OSHI-Access-Code': accessCode} : {}),
        },
        credentials: 'omit',
        body: JSON.stringify({ message }),
        signal: controller.signal,
      });
      if (response.status === 401 && requiresAccessCode) {
        accessCode = '';
        accessForm.hidden = false;
        accessStatus.textContent = 'El código ya no es válido. Introduce el código vigente.';
      }
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
    if (requiresAccessCode) input.placeholder = 'Introduce el código para empezar';
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
