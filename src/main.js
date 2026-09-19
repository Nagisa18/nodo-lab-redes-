import './styles.css';
import * as XLSX from 'xlsx';

// ─── Constantes ────────────────────────────────────────────────────────────
const ADMIN_SECRET_HASH = '#nodo-admin-locked';
const API_URL = '/api/results';
const RANKING_POLL_INTERVAL = 4000;   // 4 s durante el quiz
const ADMIN_REFRESH_INTERVAL = 8000;  // 8 s en el panel admin

// ─── Temas ─────────────────────────────────────────────────────────────────
const themes = [
  { id: 'cliente',      short: 'C / S', label: 'Cliente / servidor', icon: '↔' },
  { id: 'p2p',          short: 'P2P',   label: 'Par a par',           icon: '◈' },
  { id: 'distribuidas', short: 'RD',    label: 'Redes distribuidas',  icon: '⎈' },
];

// ─── Banco ampliado de preguntas (10 por tema, se eligen 5 al azar) ─────────
const questions = {
  cliente: [
    {
      prompt: '¿Cuál es una ventaja de centralizar los servicios en la arquitectura cliente/servidor?',
      options: ['No requiere conexión de red', 'Facilita la administración, seguridad y el control', 'Todos los clientes tienen copia de todos los datos', 'Elimina la necesidad de autenticación'],
      correct: 1,
      detail: 'La centralización simplifica la administración, control y mantenimiento.',
    },
    {
      prompt: '¿Qué protocolo se usa típicamente para solicitar y transferir páginas web en este modelo?',
      options: ['HTTP / HTTPS', 'FTP', 'SMTP', 'DHCP'],
      correct: 0,
      detail: 'HTTP/HTTPS es el protocolo cliente-servidor estándar para la web.',
    },
    {
      prompt: '¿Qué ocurre típicamente cuando un cliente solicita un recurso?',
      options: ['El servidor procesa la petición y responde con los datos', 'Los demás nodos de la red se desconectan', 'La red se satura de inmediato', 'El cliente debe almacenar toda la base de datos'],
      correct: 0,
      detail: 'El servidor atiende la solicitud enviada por el cliente y devuelve la respuesta.',
    },
    {
      prompt: '¿Cuál es el principal punto único de fallo (SPOF) en una arquitectura cliente/servidor simple?',
      options: ['El servidor central', 'Cualquier cliente desconectado', 'El navegador web del usuario', 'El cable del teclado'],
      correct: 0,
      detail: 'Si el servidor central se apaga o falla, ningún cliente puede acceder al servicio.',
    },
    {
      prompt: '¿Cuál es la función principal de un servidor DNS en este modelo?',
      options: ['Traducir nombres de dominio legibles a direcciones IP numéricas', 'Distribuir descargas masivas entre usuarios', 'Crear el cableado de fibra óptica', 'Proteger contraseñas únicamente de forma local'],
      correct: 0,
      detail: 'El DNS actúa como directorio telefónico de internet convirtiendo nombres en IPs.',
    },
    {
      prompt: '¿Cuál de los siguientes es un ejemplo clásico del modelo cliente/servidor?',
      options: ['Navegar en un sitio web con Google Chrome', 'Compartir archivos torrent con BitTorrent', 'Minar transacciones en la red Bitcoin', 'Conectar dos computadores directamente por Bluetooth'],
      correct: 0,
      detail: 'El navegador es el cliente que pide datos al servidor web central de la página.',
    },
    {
      prompt: '¿Cómo suele escalar un servidor cuando aumenta drásticamente el número de clientes?',
      options: ['Añadiendo recursos de hardware (escalado vertical) o más servidores (horizontal)', 'Apagando clientes aleatoriamente', 'Cambiando el nombre del equipo servidor', 'Disminuyendo la velocidad del reloj del procesador'],
      correct: 0,
      detail: 'Se escala mejorando el hardware del equipo o distribuyendo la carga en múltiples servidores.',
    },
    {
      prompt: '¿Qué rol desempeña la base de datos en un sistema cliente/servidor corporativo?',
      options: ['Almacenar y gestionar de forma centralizada la información del sistema', 'Dibujar la interfaz visual en la pantalla del cliente', 'Gestionar las tarjetas de red de cada usuario', 'Reemplazar los switches de la oficina'],
      correct: 0,
      detail: 'El motor de base de datos reside en el backend para resguardar la persistencia de datos.',
    },
    {
      prompt: '¿Qué modelo de interacción caracteriza la comunicación en cliente/servidor?',
      options: ['Solicitud - Respuesta (Request - Response)', 'Transmisión sin acuse ni espera', 'Pares idénticos que no se solicitan datos', 'Solo emisión de radio unidireccional'],
      correct: 0,
      detail: 'El cliente inicia la interacción enviando una petición y espera la respuesta del servidor.',
    },
    {
      prompt: '¿Cuál es una desventaja de cliente/servidor frente al modelo descentralizado?',
      options: ['Alta dependencia de la disponibilidad del servidor central', 'Incapacidad absoluta de proteger datos con contraseña', 'No permite que más de dos clientes se conecten', 'Requiere que cada cliente sea un supercomputador'],
      correct: 0,
      detail: 'Toda la operatividad depende de la salud y conectividad del servidor central.',
    },
  ],

  p2p: [
    {
      prompt: '¿Qué caracteriza esencialmente a una red Par a Par (P2P)?',
      options: ['Un solo servidor central todopoderoso', 'Los nodos actúan como iguales (clientes y servidores a la vez)', 'Solo existe un cliente que consulta a los demás', 'No se permite el intercambio de ningún archivo'],
      correct: 1,
      detail: 'En P2P cada nodo o peer puede solicitar y proveer recursos simultáneamente.',
    },
    {
      prompt: '¿Qué ventaja económica y técnica ofrece una red P2P?',
      options: ['Aumenta la necesidad de servidores caros', 'Reduce los costes de infraestructura centralizada aprovechando recursos de los nodos', 'Desactiva la conexión a internet', 'Obliga a comprar licencias a un único proveedor'],
      correct: 1,
      detail: 'La carga y almacenamiento se distribuyen entre los equipos de los propios participantes.',
    },
    {
      prompt: '¿Qué ocurre en una red P2P si uno de los nodos se desconecta?',
      options: ['La red continúa operando con los demás nodos disponibles', 'Toda la red mundial se cae al instante', 'Se borran los datos en todos los dispositivos', 'El router principal se bloquea'],
      correct: 0,
      detail: 'La descentralización evita puntos únicos de fallo; la red sigue viva con los nodos restantes.',
    },
    {
      prompt: '¿Cuál de las siguientes tecnologías o aplicaciones es un ejemplo emblemático de P2P?',
      options: ['El protocolo BitTorrent para distribución de archivos', 'El correo corporativo en un servidor Exchange', 'La página web de un banco central', 'Una base de datos en un mainframe'],
      correct: 0,
      detail: 'BitTorrent permite que usuarios compartan fragmentos de archivos entre sí directamente.',
    },
    {
      prompt: '¿Qué término define a un nodo que descarga y sube partes de un recurso en redes P2P?',
      options: ['Peer (Par)', 'Servidor Maestro Absoluto', 'Terminal tonta (Dummy)', 'Cliente pasivo sin disco'],
      correct: 0,
      detail: 'Un peer es un nodo equivalente dentro de la red.',
    },
    {
      prompt: '¿Cuál es un desafío común en las redes P2P descentralizadas no estructuradas?',
      options: ['La localización eficiente de recursos y la verificación de integridad', 'El costo mensual de pagar un centro de datos central', 'La imposibilidad de conectarse a internet', 'Que solo funcionan con cables coaxiales'],
      correct: 0,
      detail: 'Sin índice central, encontrar nodos con el archivo y validar su integridad requiere algoritmos especiales.',
    },
    {
      prompt: '¿Qué tecnología de registro distribuido moderna opera sobre una red P2P?',
      options: ['Blockchain (cadena de bloques)', 'Servidores proxy tradicionales', 'Cables telefónicos analógicos', 'Discos duros externos USB'],
      correct: 0,
      detail: 'Blockchain se basa en una red P2P para sincronizar y validar transacciones sin intermediarios.',
    },
    {
      prompt: '¿Por qué las redes P2P tienen alta tolerancia a fallos?',
      options: ['Porque no tienen un único punto de fallo central', 'Porque están conectadas por satélites militares', 'Porque impiden que los usuarios apaguen sus equipos', 'Porque no usan protocolos de comunicación'],
      correct: 0,
      detail: 'Al no depender de un servidor central único, ningún nodo individual puede tumbar la red entera.',
    },
    {
      prompt: '¿Qué papel desempeña un archivo .torrent o enlace magnet en P2P?',
      options: ['Contiene metadatos y hashes para localizar y verificar piezas del archivo', 'Contiene el archivo completo comprimido dentro', 'Es un virus diseñado para reiniciar el equipo', 'Es una clave privada bancaria'],
      correct: 0,
      detail: 'Permite identificar qué bloques componen el archivo y calcular sus firmas hash.',
    },
    {
      prompt: '¿Cómo se comporta el ancho de banda total en una red P2P a medida que entran más usuarios?',
      options: ['Aumenta, ya que cada nuevo usuario aporta capacidad de subida', 'Disminuye a cero de inmediato', 'Permanece siempre estático en 1 Mbps', 'El proveedor de internet cancela la conexión'],
      correct: 0,
      detail: 'A mayor cantidad de participantes compartiendo, mayor es la capacidad global de la red.',
    },
  ],

  distribuidas: [
    {
      prompt: '¿Cuál es una meta primordial al diseñar una red o sistema distribuido?',
      options: ['Concentrar todo el procesamiento en una sola máquina', 'Aumentar la tolerancia a fallos, la concurrencia y la escalabilidad', 'Eliminar la comunicación entre equipos', 'Impedir que más de un usuario acceda al mismo tiempo'],
      correct: 1,
      detail: 'Los sistemas distribuidos buscan resiliencia, alta disponibilidad y capacidad de crecimiento.',
    },
    {
      prompt: '¿Qué significa "tolerancia a fallos" en una arquitectura distribuida?',
      options: ['La capacidad de continuar operando correctamente aun si uno o varios nodos fallan', 'Garantizar que ningún programador cometa errores', 'Desconectar la red al primer indicio de demora', 'Reiniciar todos los computadores a medianoche'],
      correct: 0,
      detail: 'Si un nodo colapsa, otros nodos asumen la carga sin interrumpir el servicio global.',
    },
    {
      prompt: '¿Qué técnica se usa para repartir las peticiones entrantes entre múltiples servidores réplica?',
      options: ['Balanceo de carga (Load Balancing)', 'Cifrado simétrico', 'Formateo de disco', 'Cableado en cascada'],
      correct: 0,
      detail: 'Un balanceador reparte el tráfico para evitar que un solo nodo se sature.',
    },
    {
      prompt: '¿Cuál es un desafío fundamental al mantener datos sincronizados en sistemas distribuidos?',
      options: ['Garantizar la consistencia y el consenso entre réplicas geográficamente dispersas', 'Conectar los cables con la misma longitud exacta', 'Obligar a todos los nodos a usar la misma marca de pantalla', 'Impedir el uso de direcciones IP'],
      correct: 0,
      detail: 'Algoritmos como Raft o Paxos son necesarios para lograr consenso ante latencias y particiones.',
    },
    {
      prompt: '¿Qué establece el conocido Teorema CAP en sistemas distribuidos?',
      options: ['Solo es posible garantizar 2 de 3 propiedades: Consistencia, Disponibilidad y Tolerancia a particiones', 'Que las computadoras siempre son más rápidas que las personas', 'Que la red debe usar cables de cobre categoría 6', 'Que los clientes nunca pueden equivocarse'],
      correct: 0,
      detail: 'En presencia de una partición de red, se debe elegir entre consistencia o disponibilidad.',
    },
    {
      prompt: '¿Cómo beneficia la replicación de datos a un servicio en la nube distribuido?',
      options: ['Mejora los tiempos de respuesta locales y previene pérdida catastrófica de información', 'Multiplica por diez el consumo de energía innecesariamente', 'Obliga a que los clientes nunca puedan desconectarse', 'Convierte la aplicación en un sistema analógico'],
      correct: 0,
      detail: 'Replicar acerca los datos al usuario y asegura disponibilidad si una región sufre una avería.',
    },
    {
      prompt: '¿Cuál es la diferencia de concepto entre descentralizado y distribuido?',
      options: ['En distribuido no hay un centro dominante; la toma de decisiones y el procesamiento se reparten', 'No existe ninguna diferencia; son exactamente lo mismo', 'Distribuido solo se refiere a cables eléctricos', 'Descentralizado significa que solo funciona en una sola habitación'],
      correct: 0,
      detail: 'La arquitectura distribuida distribuye almacenamiento y cómputo entre nodos independientes.',
    },
    {
      prompt: '¿Qué es la "latencia" de red en un entorno distribuido?',
      options: ['El tiempo que tarda un paquete de datos en viajar de un nodo a otro', 'El peso físico del servidor en kilogramos', 'La cantidad de memoria RAM instalada en el cliente', 'El número de pantallas conectadas al switch'],
      correct: 0,
      detail: 'La latencia es el retardo temporal en la propagación y procesamiento de mensajes entre nodos.',
    },
    {
      prompt: '¿Qué papel cumple un middleware en una arquitectura distribuida?',
      options: ['Capa de software que oculta la heterogeneidad y facilita la comunicación entre nodos', 'El cable de fibra óptica que conecta los países', 'El monitor donde el técnico vigila los datos', 'La contraseña maestra del sistema operativo'],
      correct: 0,
      detail: 'El middleware permite que componentes en distintos lenguajes y SO se comuniquen transparentemente.',
    },
    {
      prompt: '¿Qué ventaja clave ofrece la computación en la nube actual gracias a redes distribuidas?',
      options: ['Elasticidad: capacidad de asignar o liberar nodos automáticamente según la demanda', 'Garantizar que nunca se use internet', 'Obligar a comprar servidores físicos para la casa', 'Eliminar la necesidad de programar software'],
      correct: 0,
      detail: 'La nube aprovecha granjas masivas de nodos distribuidos para escalar según la demanda.',
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
  activeQuestions: [], // Aquí se guardan las 5 preguntas seleccionadas al azar
  answers: [],
  results: [],
};

// Función para barajar preguntas
function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ─── Polling en tiempo real ─────────────────────────────────────────────────
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

function refreshRankingPanel() {
  const listEl = document.querySelector('.ranking-inline-list');
  if (listEl) {
    listEl.innerHTML = renderUserRankingList();
  }
  // Actualizar también la posición estimada en el panel
  const posEl = document.querySelector('.live-my-position-val');
  if (posEl) {
    const r = getRanking();
    const idx = r.findIndex((e) => e.userName.toLowerCase() === state.userName.toLowerCase());
    posEl.textContent = idx >= 0 ? `#${idx + 1}` : `#${r.length + 1}`;
  }
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
  const usersEl = document.querySelector('.admin-stat-users');
  const avgEl   = document.querySelector('.admin-stat-avg');
  if (usersEl) usersEl.textContent = ranking.length;
  if (avgEl)   avgEl.textContent =
    ranking.length
      ? Math.round(ranking.reduce((s, e) => s + e.score, 0) / ranking.length) + '%'
      : '0%';
  bindDeleteRowButtons();
}

// ─── API helpers ────────────────────────────────────────────────────────────
async function loadResults() {
  try {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error('Error al cargar resultados');
    return await res.json();
  } catch (err) {
    console.error('Error loadResults:', err);
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
    if (!res.ok) {
      const errDetail = await res.text();
      console.error('Error en POST /api/results:', res.status, errDetail);
      throw new Error(`Error ${res.status}: ${errDetail}`);
    }
    state.results = await res.json();
  } catch (err) {
    console.warn('Fallback guardando resultado en memoria local:', err);
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
  if (!state.activeQuestions.length) {
    state.activeQuestions = questions[state.selectedTheme].slice(0, 5);
  }
  return state.activeQuestions[state.currentQuestion] || questions[state.selectedTheme][0];
}

function calculateFinalResult() {
  const total   = state.activeQuestions.length || 5;
  const correct = state.answers.filter(Boolean).length;
  const wrong   = total - correct;
  const score   = Math.round((correct / total) * 100);
  return { correct, wrong, score, total };
}

async function storeUserResult() {
  const { correct, wrong, score } = calculateFinalResult();
  const result = {
    id: `r-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
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

// ─── Ranking lateral (solo posiciones y usuarios) ───────────────────────────
function renderUserRankingList() {
  const ranking = getRanking();

  if (!ranking.length) {
    return '<div class="ranking-empty">Aún no hay otros participantes.<br><small style="opacity:0.7">¡Sé el primero en el ranking!</small></div>';
  }

  return ranking
    .map((entry) => {
      const isCurrent = entry.userName.toLowerCase() === state.userName.toLowerCase();
      return `
        <div class="ranking-inline-item${isCurrent ? ' current-user' : ''}">
          <span class="ranking-position">#${entry.position}</span>
          <span class="ranking-name">${entry.userName} ${isCurrent ? '<small style="font-weight:normal;opacity:0.75">(Tú)</small>' : ''}</span>
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
          <span>5 PREGUNTAS ALEATORIAS</span>
        </div>

        <h1>Piensa en <span class="red-word">red</span><span class="dot">.</span></h1>

        <p class="lead">
          Pon a prueba tu criterio sobre cómo los dispositivos se conectan,
          colaboran y distribuyen el trabajo.
        </p>

        <!-- Selección de Tema -->
        <div class="theme-selector-wrap">
          <div class="theme-selector-label">ELIGE UN MÓDULO</div>
          <div class="stats-grid">
            ${themes
              .map(
                (t) => `
                  <button type="button" class="stat-card ${state.selectedTheme === t.id ? 'selected' : ''}" data-theme="${t.id}">
                    <div class="stat-line">
                      <span class="stat-icon">${t.icon}</span>
                      <span class="code">${t.short}</span>
                    </div>
                    <span class="label">${t.label}</span>
                  </button>
                `
              )
              .join('')}
          </div>
        </div>

        <section class="quiz-panel intro-panel">
          <div class="quiz-header">
            <span>ANTES DE EMPEZAR</span>
            <span>05 PREGUNTAS</span>
          </div>

          <div class="quiz-content">
            <div class="question-block">
              <h2>¿Quién está <span>en línea?</span></h2>
              <p>Registra tu nombre para competir en el ranking en vivo.</p>
            </div>

            <form class="name-form" id="start-form">
              <label for="name">Tu nombre de usuario</label>
              <div class="input-row">
                <input id="name" type="text" maxlength="24" placeholder="Escribe tu nombre" value="${state.userName}" required />
                <button type="submit">INICIAR RETO</button>
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
  const currentIndex  = state.currentQuestion + 1;
  const total         = state.activeQuestions.length || 5;

  const ranking = getRanking();
  const myIdx = ranking.findIndex((e) => e.userName.toLowerCase() === state.userName.toLowerCase());
  const myPosText = myIdx >= 0 ? `#${myIdx + 1}` : `#${ranking.length + 1}`;

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
              <span>PARTICIPANTE: <strong>${state.userName.toUpperCase()}</strong></span>
              <span>PREGUNTA ${String(currentIndex).padStart(2, '0')} / ${String(total).padStart(2, '0')}</span>
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

          <!-- Columna derecha: ÚNICAMENTE RANKING EN TIEMPO REAL -->
          <aside class="score-panel">
            <div class="panel-header">
              <span>RANKING EN TIEMPO REAL</span>
              <span class="dot-live"></span>
            </div>

            <!-- Posición del usuario actual -->
            <div class="live-user-rank-box">
              <div class="live-my-position-val">${myPosText}</div>
              <div class="live-my-position-label">tu puesto en el ranking</div>
            </div>

            <div class="ranking-panel-live">
              <div class="ranking-header-row">
                <div class="ranking-title">Tabla de posiciones</div>
                <small style="font-size:0.65rem;opacity:0.6;">En vivo</small>
              </div>
              <div class="ranking-inline-list">${renderUserRankingList()}</div>
            </div>
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
    (e) => e.userName.toLowerCase() === state.userName.toLowerCase()
  );
  const userPosition = userEntry ? userEntry.position : 1;

  return `
    <div class="shell user-shell result-shell">
      ${renderTopbar()}
      <main class="page result-page">
        <div class="eyebrow-row">
          <span>LABORATORIO DE REDES</span>
          <span>•</span>
          <span>${getThemeMeta(state.selectedTheme).label.toUpperCase()}</span>
        </div>

        <section class="result-card result-card-position-only">
          <div class="result-summary">
            <div class="summary-meta">${state.userName.toUpperCase()} • ${getThemeMeta(state.selectedTheme).label}</div>
            <h2>¡Cuestionario finalizado!</h2>
            <div class="result-points">${final.score}<span>%</span></div>
            <p>Has completado tus 5 preguntas. Tu posición en el ranking general se encuentra calculada a continuación:</p>
          </div>

          <!-- SOLO LA POSICIÓN (eliminadas las cajas de buenas y malas) -->
          <div class="result-side-position-only">
            <div class="mini-score-box position-highlight-box">
              <div class="mini-score-value">#${userPosition}</div>
              <div class="mini-score-label">tu posición final en el ranking</div>
            </div>
          </div>
        </section>

        <div class="result-actions">
          <button type="button" class="primary-button" id="restart-btn">RESOLVER OTRO RETO</button>
        </div>
      </main>
    </div>
  `;
}

// ─── Vista admin (conserva todos los detalles para el docente) ───────────────
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
          <th class="action-th">Acción</th>
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
                      <td><strong>${e.userName}</strong></td>
                      <td>${e.themeLabel}</td>
                      <td class="cell-good">${e.correct}</td>
                      <td class="cell-bad">${e.wrong}</td>
                      <td><span class="score-badge">${e.score}%</span></td>
                      <td style="text-align:center;">
                        <button type="button" class="admin-row-delete" data-id="${e.id}" title="Eliminar este resultado de prueba">
                          🗑️
                        </button>
                      </td>
                    </tr>
                  `
                )
                .join('')
            : `<tr><td colspan="7" class="empty-state">Aún no hay resultados registrados.</td></tr>`
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
              <span>RESULTADOS GENERALES</span>
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
            <button type="button" class="admin-clear-btn" id="clear-all-btn" title="Vaciar todos los resultados de prueba">
              LIMPIAR REGISTROS
            </button>
          </div>
        </div>

        <div class="admin-live-badge">
          <span class="dot-live"></span>
          <span>Actualización automática en tiempo real</span>
        </div>

        <div class="admin-table-wrap">
          ${buildAdminTable(ranking)}
        </div>
      </main>
    </div>
  `;
}

function bindDeleteRowButtons() {
  document.querySelectorAll('.admin-row-delete').forEach((btn) => {
    btn.onclick = async (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      if (!id) return;
      if (window.confirm('¿Deseas eliminar este registro de prueba?')) {
        try {
          const res = await fetch(`/api/results?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
          if (res.ok) {
            state.results = await res.json();
            refreshAdminTable();
          }
        } catch (err) {
          console.error('Error eliminando fila:', err);
        }
      }
    };
  });
}

// ─── Bind events ─────────────────────────────────────────────────────────────
function bindEvents() {
  // Selección de tema
  document.querySelectorAll('[data-theme]').forEach((card) => {
    card.addEventListener('click', () => {
      state.selectedTheme = card.dataset.theme;
      render();
    });
  });

  // Iniciar Quiz
  const startForm = document.getElementById('start-form');
  if (startForm) {
    startForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const value = document.getElementById('name').value.trim();
      if (!value) {
        window.alert('Debes escribir tu nombre para continuar.');
        return;
      }
      state.userName = value;

      // Seleccionar 5 preguntas aleatorias del tema elegido
      const pool = questions[state.selectedTheme] || questions.cliente;
      state.activeQuestions = shuffleArray(pool).slice(0, 5);

      state.step = 'quiz';
      state.answers = [];
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

      const totalQs = state.activeQuestions.length || 5;
      if (state.currentQuestion < totalQs - 1) {
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
      state.activeQuestions = [];
      hydrateResults();
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

  // Botones borrar fila
  bindDeleteRowButtons();

  // Botón limpiar todos los registros
  const clearAllBtn = document.getElementById('clear-all-btn');
  if (clearAllBtn) {
    clearAllBtn.addEventListener('click', async () => {
      if (window.confirm('¿Estás segura de eliminar TODOS los registros de prueba? Esta acción vaciará la tabla para empezar la clase limpia.')) {
        try {
          const res = await fetch('/api/results?id=all', { method: 'DELETE' });
          if (res.ok) {
            state.results = await res.json();
            refreshAdminTable();
          }
        } catch (err) {
          console.error('Error limpiando todo:', err);
        }
      }
    });
  }
}

// ─── Init ────────────────────────────────────────────────────────────────────
hydrateResults();
