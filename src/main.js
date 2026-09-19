import './styles.css';
import * as XLSX from 'xlsx';

// ─── Constantes ────────────────────────────────────────────────────────────
const ADMIN_SECRET_HASH = '#nodo-admin-locked';
const API_URL = '/api/results';
const RANKING_POLL_INTERVAL = 5000;   // 5 s durante el quiz
const ADMIN_REFRESH_INTERVAL = 10000; // 10 s en el panel admin

// ─── Temas y preguntas ─────────────────────────────────────────────────────
const themes = [
  { id: 'cliente',      short: 'C / S', label: 'Cliente / servidor', icon: '↔' },
  { id: 'p2p',          short: 'P2P',   label: 'Par a par',           icon: '◈' },
  { id: 'distribuidas', short: 'RD',    label: 'Redes distribuidas',  icon: '⎈' },
];

const questions = {
  cliente: [
    {
      prompt: '¿Cuál es una ventaja de centralizar los servicios?',
      options: ['No requiere red', 'Facilita la administración y el control', 'Todos tienen los datos', 'Elimina la autenticación'],
      correct: 1,
      detail: 'La centralización simplifica administración, control y mantenimiento.',
    },
    {
      prompt: '¿Qué protocolo se usa normalmente para solicitar páginas web?',
      options: ['HTTP', 'FTP', 'SMTP', 'DHCP'],
      correct: 0,
      detail: 'HTTP es el protocolo principal para navegar e intercambiar páginas web.',
    },
    {
      prompt: '¿Qué ocurre cuando un cliente solicita un recurso?',
      options: ['El servidor responde con datos', 'Los nodos se eliminan', 'La red se corta', 'El cliente guarda todo en local'],
      correct: 0,
      detail: 'En la arquitectura cliente-servidor, el servidor atiende la petición del cliente.',
    },
  ],
  p2p: [
    {
      prompt: '¿Qué caracteriza mejor una red P2P?',
      options: ['Un solo servidor central', 'Los equipos actúan como iguales', 'Solo hay un cliente', 'No hay intercambio de datos'],
      correct: 1,
      detail: 'En P2P cada nodo puede ser cliente y servidor al mismo tiempo.',
    },
    {
      prompt: '¿Qué ventaja ofrece una red P2P?',
      options: ['Aumenta la dependencia de un punto central', 'Reduce costes de infraestructura', 'Desactiva la conexión', 'No requiere nodos'],
      correct: 1,
      detail: 'Las redes P2P suelen distribuir carga y recursos entre nodos equivalentes.',
    },
    {
      prompt: '¿Qué es típico en una red P2P?',
      options: ['Todos los nodos pueden compartir recursos', 'Solo un equipo administra todo', 'Se necesita un solo router', 'No existen archivos'],
      correct: 0,
      detail: 'El intercambio directo entre pares es la base del modelo P2P.',
    },
  ],
  distribuidas: [
    {
      prompt: '¿Qué mejora una red distribuida?',
      options: ['Centraliza todo en un único punto', 'Aumenta tolerancia a fallos', 'Elimina la comunicación', 'No permite escalabilidad'],
      correct: 1,
      detail: 'Una red distribuida reparte la carga y reduce el impacto de fallos locales.',
    },
    {
      prompt: '¿Qué propiedad suele ser clave en redes distribuidas?',
      options: ['Dependencia total de un servidor', 'Escalabilidad y redundancia', 'Ausencia de nodos', 'Transmisión analógica'],
      correct: 1,
      detail: 'La redundancia y la capacidad de crecimiento son características esenciales.',
    },
    {
      prompt: '¿Cuál es un beneficio directo de arquitectura distribuida?',
      options: ['Pérdida de resiliencia', 'Continuidad en caso de fallos parciales', 'Uso exclusivo de un hardware', 'Menos usuarios concurrentes'],
      correct: 1,
      detail: 'La distribución ayuda a mantener servicio incluso si un nodo falla.',
    },
  ],
};

// ─── App root ───────────────────────────────────────────────────────────────
const app = document.querySelector('#app');

// ─── Estado global ─────────────────────────────────────────────────────────
const state = {
  role: window.location.hash === ADMIN_SECRET_HASH ? 'admin' : 'user',
  step: 'landing',
  userName: '',
  selectedTheme: themes[0].id,
  currentQuestion: 0,
  answers: [],
  results: [],
};

// ─── Polling ────────────────────────────────────────────────────────────────
let pollingTimer = null;

function startRankingPolling() {
  stopRankingPolling();
  pollingTimer = setInterval(async () => {
    const fresh = await loadResults();
    state.results = fresh;
    refreshRankingPanel();
  }, RANKING_POLL_INTERVAL);
}

function stopRankingPolling() {
  if (pollingTimer) {
    clearInterval(pollingTimer);
    pollingTimer = null;
  }
}

/**
 * Actualiza únicamente el panel de ranking lateral sin re-renderizar toda
 * la vista — evita perder el foco del usuario mientras responde.
 */
function refreshRankingPanel() {
  const listEl = document.querySelector('.ranking-inline-list');
  if (!listEl) return;
  listEl.innerHTML = renderUserRankingList();
}

// ─── Admin auto-refresh ─────────────────────────────────────────────────────
let adminTimer = null;

function startAdminPolling() {
  stopAdminPolling();
  adminTimer = setInterval(async () => {
    state.results = await loadResults();
    refreshAdminTable();
  }, ADMIN_REFRESH_INTERVAL);
}

function stopAdminPolling() {
  if (adminTimer) {
    clearInterval(adminTimer);
    adminTimer = null;
  }
}

function refreshAdminTable() {
  const wrap = document.querySelector('.admin-table-wrap');
  if (!wrap) return;
  const ranking = getRanking();
  wrap.innerHTML = buildAdminTable(ranking);
  // Actualiza también los contadores del header
  const usersEl = document.querySelector('.admin-stat-users');
  const avgEl   = document.querySelector('.admin-stat-avg');
  if (usersEl) usersEl.textContent = ranking.length;
  if (avgEl)   avgEl.textContent =
    ranking.length
      ? Math.round(ranking.reduce((s, e) => s + e.score, 0) / ranking.length) + '%'
      : '0%';
}

// ─── API helpers ────────────────────────────────────────────────────────────
async function loadResults() {
  try {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error();
    return await res.json();
  } catch {
    return state.results;
  }
}

async function saveResults(result) {
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result),
    });
    if (!res.ok) throw new Error();
    state.results = await res.json();
  } catch {
    state.results = [...state.results, result];
  }
}

async function hydrateResults() {
  state.results = await loadResults();
  render();
}

// ─── Helpers de quiz ────────────────────────────────────────────────────────
function getThemeMeta(id) {
  return themes.find((t) => t.id === id) || themes[0];
}

function getCurrentQuestion() {
  return questions[state.selectedTheme][state.currentQuestion];
}

function calculateFinalResult() {
  const qs      = questions[state.selectedTheme];
  const correct = state.answers.filter(Boolean).length;
  const wrong   = qs.length - correct;
  const score   = Math.round((correct / qs.length) * 100);
  return { correct, wrong, score };
}

async function storeUserResult() {
  const { correct, wrong, score } = calculateFinalResult();
  const result = {
    id: crypto.randomUUID ? crypto.randomUUID() : `r-${Date.now()}`,
    userName:   state.userName,
    theme:      state.selectedTheme,
    themeLabel: getThemeMeta(state.selectedTheme).label,
    correct,
    wrong,
    score,
    createdAt: new Date().toISOString(),
  };
  await saveResults(result);
  return result;
}

function getRanking() {
  return [...state.results]
    .sort((a, b) => b.score - a.score || a.wrong - b.wrong || a.userName.localeCompare(b.userName))
    .map((item, i) => ({ ...item, position: i + 1 }));
}

// ─── Excel export ───────────────────────────────────────────────────────────
function exportToExcel() {
  const ranking = getRanking();
  if (!ranking.length) {
    window.alert('No hay resultados para exportar aún.');
    return;
  }

  const rows = ranking.map((e) => ({
    'Posición':  e.position,
    'Usuario':   e.userName,
    'Tema':      e.themeLabel,
    'Buenas':    e.correct,
    'Malas':     e.wrong,
    'Puntaje %': e.score,
  }));

  const ws = XLSX.utils.json_to_sheet(rows);

  // Ancho de columnas
  ws['!cols'] = [
    { wch: 10 },
    { wch: 24 },
    { wch: 22 },
    { wch: 8 },
    { wch: 8 },
    { wch: 12 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Resultados');

  const fecha = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `nodo-lab-resultados-${fecha}.xlsx`);
}

// ─── Render principal ────────────────────────────────────────────────────────
function render() {
  stopRankingPolling();
  stopAdminPolling();

  if (state.role === 'admin') {
    app.innerHTML = renderAdminView();
    bindEvents();
    startAdminPolling();
  } else {
    app.innerHTML = renderUserView();
    bindEvents();
    if (state.step === 'quiz') startRankingPolling();
  }
}

// ─── Ranking lateral ────────────────────────────────────────────────────────
function renderUserRankingList() {
  const ranking = getRanking();

  if (!ranking.length) {
    return '<div class="ranking-empty">Aún no hay participantes.</div>';
  }

  return ranking
    .map((entry) => {
      const isCurrent = entry.userName === state.userName;
      return `
        <div class="ranking-inline-item${isCurrent ? ' current-user' : ''}">
          <span class="ranking-position">#${entry.position}</span>
          <span class="ranking-name">${entry.userName}</span>
          <span class="ranking-score">${entry.score}%</span>
        </div>
      `;
    })
    .join('');
}

// ─── Vistas de usuario ────────────────────────────────────────────────────
function renderUserView() {
  if (state.step === 'landing') return renderLanding();
  if (state.step === 'quiz')    return renderQuiz();
  if (state.step === 'result')  return renderResult();
  return '';
}

function renderTopbar(extra = '') {
  return `
    <header class="topbar">
      <div class="brand" aria-label="NODO LAB logo">
        <div class="brand-mark">N</div>
        <div class="brand-text">NODO <span>/</span> LAB</div>
      </div>
      <nav class="topnav" aria-label="Navegación principal">
        <button class="nav-button" type="button">SESIÓN DE PRÁCTICA</button>
        ${extra}
      </nav>
    </header>
  `;
}

function renderLanding() {
  return `
    <div class="shell user-shell">
      ${renderTopbar()}
      <main class="page landing-page">
        <div class="eyebrow-row">
          <span>LABORATORIO DE REDES</span>
          <span>•</span>
          <span>03 MÓDULOS</span>
        </div>

        <h1>Piensa en <span class="red-word">red</span><span class="dot">.</span></h1>

        <p class="lead">
          Pon a prueba tu criterio sobre cómo los dispositivos se conectan,
          colaboran y distribuyen el trabajo.
        </p>

        <section class="quiz-panel intro-panel">
          <div class="quiz-header">
            <span>ANTES DE EMPEZAR</span>
            <span>01 / 03</span>
          </div>

          <div class="quiz-content">
            <div class="question-block">
              <h2>¿Quién está <span>en línea?</span></h2>
              <p>Registra tu nombre para guardar tu progreso en esta sesión.</p>
            </div>

            <form class="name-form" id="start-form">
              <label for="name">Tu nombre</label>
              <div class="input-row">
                <input id="name" type="text" maxlength="28" placeholder="Escribe tu nombre" value="${state.userName}" />
                <button type="submit">EMPEZAR</button>
              </div>
            </form>
          </div>
        </section>
      </main>
    </div>
  `;
}

function renderQuiz() {
  const question      = getCurrentQuestion();
  const answeredCount = state.answers.length;
  const currentIndex  = state.currentQuestion + 1;
  const total         = questions[state.selectedTheme].length;
  const currentScore  = state.answers.filter(Boolean).length;

  return `
    <div class="shell user-shell quiz-shell">
      ${renderTopbar()}
      <main class="page quiz-page">
        <div class="eyebrow-row">
          <span>LABORATORIO DE REDES</span>
          <span>•</span>
          <span>${getThemeMeta(state.selectedTheme).label.toUpperCase()}</span>
        </div>

        <div class="quiz-layout">
          <!-- Columna izquierda: pregunta -->
          <section class="quiz-main">
            <div class="question-meta">
              <span>HOLA, ${state.userName.toUpperCase()}</span>
              <span>${String(currentIndex).padStart(2, '0')} / ${String(total).padStart(2, '0')}</span>
            </div>

            <div class="question-block-main">
              <div class="question-tag">PREGUNTA ${currentIndex}. <span>${getThemeMeta(state.selectedTheme).label}</span></div>
              <h2>${question.prompt}</h2>

              <div class="answers-list">
                ${question.options
                  .map(
                    (option, index) => `
                      <button
                        class="answer-option ${state.answers[state.currentQuestion] === index ? 'selected' : ''}"
                        data-index="${index}"
                        type="button"
                      >
                        <span class="choice-letter">${String.fromCharCode(65 + index)}</span>
                        <span>${option}</span>
                        <span class="answer-arrow">›</span>
                      </button>
                    `
                  )
                  .join('')}
              </div>
            </div>
          </section>

          <!-- Columna derecha: panel de resultado en vivo + ranking -->
          <aside class="score-panel">
            <div class="panel-header">
              <span>RESULTADO EN VIVO</span>
              <span class="dot-live"></span>
            </div>
            <div class="score-number">${currentScore}</div>
            <div class="score-label">respuestas correctas</div>

            <div class="status-list">
              <div class="status-item">
                <span class="status-dot green"></span>
                <span>ACIERTO</span>
                <strong>${currentScore}</strong>
              </div>
              <div class="status-item">
                <span class="status-dot orange"></span>
                <span>POR REVISAR</span>
                <strong>${total - answeredCount}</strong>
              </div>
            </div>

            <!-- Ranking en tiempo real -->
            <div class="ranking-panel">
              <div class="ranking-header-row">
                <div class="ranking-title">Ranking en vivo</div>
                <span class="dot-live"></span>
              </div>
              <div class="ranking-inline-list">${renderUserRankingList()}</div>
            </div>

            <div class="mini-note">${question.detail}</div>
          </aside>
        </div>
      </main>
    </div>
  `;
}

function renderResult() {
  const final       = calculateFinalResult();
  const ranking     = getRanking();
  const userEntry   = ranking.find(
    (e) => e.userName === state.userName && e.theme === state.selectedTheme
  );
  const userPosition = userEntry ? userEntry.position : '—';

  return `
    <div class="shell user-shell result-shell">
      ${renderTopbar()}
      <main class="page result-page">
        <div class="eyebrow-row">
          <span>LABORATORIO DE REDES</span>
          <span>•</span>
          <span>${getThemeMeta(state.selectedTheme).label.toUpperCase()}</span>
        </div>

        <section class="result-card">
          <div class="result-summary">
            <div class="summary-meta">${state.userName.toUpperCase()} • ${getThemeMeta(state.selectedTheme).label}</div>
            <h2>Tu resultado final</h2>
            <div class="result-points">${final.score}<span>%</span></div>
            <p>${final.correct} respuestas correctas • ${final.wrong} respuestas incorrectas</p>
          </div>

          <div class="result-side">
            <div class="mini-score-box">
              <div class="mini-score-value">${userPosition}</div>
              <div class="mini-score-label">posición</div>
            </div>
            <div class="mini-score-box neutral">
              <div class="mini-score-value">${final.correct}</div>
              <div class="mini-score-label">buenas</div>
            </div>
            <div class="mini-score-box neutral">
              <div class="mini-score-value">${final.wrong}</div>
              <div class="mini-score-label">malas</div>
            </div>
          </div>
        </section>

        <div class="result-actions">
          <button type="button" class="primary-button" id="restart-btn">NUEVA SESIÓN</button>
        </div>
      </main>
    </div>
  `;
}

// ─── Vista admin ─────────────────────────────────────────────────────────────
function buildAdminTable(ranking) {
  return `
    <table class="admin-table">
      <thead>
        <tr>
          <th>Pos.</th>
          <th>Usuario</th>
          <th>Tema</th>
          <th>Buenas</th>
          <th>Malas</th>
          <th>Puntaje</th>
        </tr>
      </thead>
      <tbody>
        ${
          ranking.length
            ? ranking
                .map(
                  (e) => `
                    <tr>
                      <td><span class="pos-badge">#${e.position}</span></td>
                      <td>${e.userName}</td>
                      <td>${e.themeLabel}</td>
                      <td class="cell-good">${e.correct}</td>
                      <td class="cell-bad">${e.wrong}</td>
                      <td><span class="score-badge">${e.score}%</span></td>
                    </tr>
                  `
                )
                .join('')
            : `<tr><td colspan="6" class="empty-state">Aún no hay resultados registrados.</td></tr>`
        }
      </tbody>
    </table>
  `;
}

function renderAdminView() {
  const ranking = getRanking();
  const avg     = ranking.length
    ? Math.round(ranking.reduce((s, e) => s + e.score, 0) / ranking.length)
    : 0;

  return `
    <div class="shell admin-shell">
      <header class="topbar">
        <div class="brand" aria-label="NODO LAB logo">
          <div class="brand-mark">N</div>
          <div class="brand-text">NODO <span>/</span> LAB</div>
        </div>
        <nav class="topnav" aria-label="Navegación principal">
          <button class="nav-button" type="button">REGISTRO ADMIN</button>
          <button class="nav-button nav-secondary" type="button" id="return-user">VISTA USUARIO</button>
        </nav>
      </header>

      <main class="admin-page">
        <div class="admin-header">
          <div>
            <div class="eyebrow-row admin-eyebrow">
              <span>ADMINISTRACIÓN</span>
              <span>•</span>
              <span>RESULTADOS</span>
            </div>
            <h2>Registro general</h2>
          </div>

          <div class="admin-header-right">
            <div class="admin-summary">
              <div>
                <small>Usuarios</small>
                <strong class="admin-stat-users">${ranking.length}</strong>
              </div>
              <div>
                <small>Promedio</small>
                <strong class="admin-stat-avg">${avg}%</strong>
              </div>
            </div>
            <button type="button" class="admin-download-btn" id="download-excel-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              DESCARGAR EXCEL
            </button>
          </div>
        </div>

        <div class="admin-live-badge">
          <span class="dot-live"></span>
          <span>Actualización automática cada 10 s</span>
        </div>

        <div class="admin-table-wrap">
          ${buildAdminTable(ranking)}
        </div>
      </main>
    </div>
  `;
}

// ─── Bind events ─────────────────────────────────────────────────────────────
function bindEvents() {
  // Tarjetas de tema
  document.querySelectorAll('[data-theme]').forEach((card) => {
    card.addEventListener('click', () => {
      state.selectedTheme = card.dataset.theme;
      render();
    });
  });

  // Formulario de nombre
  const startForm = document.getElementById('start-form');
  if (startForm) {
    startForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const value = document.getElementById('name').value.trim();
      if (!value) {
        window.alert('Debes escribir tu nombre para continuar.');
        return;
      }
      state.userName      = value;
      state.step          = 'quiz';
      state.answers       = [];
      state.currentQuestion = 0;
      render();
    });
  }

  // Opciones de respuesta
  document.querySelectorAll('.answer-option').forEach((option) => {
    option.addEventListener('click', async () => {
      const idx       = Number(option.dataset.index);
      const isCorrect = idx === getCurrentQuestion().correct;
      state.answers[state.currentQuestion] = isCorrect;

      if (state.currentQuestion < questions[state.selectedTheme].length - 1) {
        state.currentQuestion += 1;
        render();
      } else {
        stopRankingPolling();
        await storeUserResult();
        state.step = 'result';
        render();
      }
    });
  });

  // Botón nueva sesión
  const restartBtn = document.getElementById('restart-btn');
  if (restartBtn) {
    restartBtn.addEventListener('click', () => {
      state.step            = 'landing';
      state.userName        = '';
      state.answers         = [];
      state.currentQuestion = 0;
      render();
    });
  }

  // Botón volver a vista usuario (admin)
  const returnUser = document.getElementById('return-user');
  if (returnUser) {
    returnUser.addEventListener('click', () => {
      stopAdminPolling();
      state.role = 'user';
      state.step = 'landing';
      render();
    });
  }

  // Botón descargar Excel
  const dlBtn = document.getElementById('download-excel-btn');
  if (dlBtn) {
    dlBtn.addEventListener('click', exportToExcel);
  }
}

// ─── Init ────────────────────────────────────────────────────────────────────
hydrateResults();
