import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataFile = path.join(__dirname, 'results.json');

const app = express();
const PORT = process.env.PORT || 3001;

// Supabase client (si están las variables de entorno configuradas)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;
const supabase = (supabaseUrl && supabaseKey)
  ? createClient(supabaseUrl, supabaseKey)
  : null;

if (supabase) {
  console.log('Conectado a base de datos Supabase');
} else {
  console.log('Modo local: usando archivo results.json (variables de Supabase no detectadas)');
}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));

// Funciones para fallback local
function readResultsLocal() {
  try {
    const raw = fs.readFileSync(dataFile, 'utf8');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeResultsLocal(results) {
  try {
    fs.writeFileSync(dataFile, JSON.stringify(results, null, 2));
  } catch (err) {
    console.error('Error escribiendo archivo local:', err);
  }
}

// Obtener todos los resultados
async function getAllResults() {
  if (supabase) {
    const { data, error } = await supabase
      .from('results')
      .select('*');

    if (error) {
      console.error('Error consultando Supabase:', error);
      throw error;
    }
    return data || [];
  }
  return readResultsLocal();
}

// Guardar resultado
async function saveResult(resultItem) {
  if (supabase) {
    const { error } = await supabase
      .from('results')
      .insert([resultItem]);

    if (error) {
      console.error('Error guardando en Supabase:', error);
      throw error;
    }
  } else {
    const local = readResultsLocal();
    writeResultsLocal([...local, resultItem]);
  }
}

function sortAndRank(list) {
  return [...list]
    .sort((a, b) => b.score - a.score || a.wrong - b.wrong || (a.userName || '').localeCompare(b.userName || ''))
    .map((entry, index) => ({ ...entry, position: index + 1 }));
}

app.get('/api/results', async (_req, res) => {
  try {
    const raw = await getAllResults();
    const ranked = sortAndRank(raw);
    res.json(ranked);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener resultados' });
  }
});

app.post('/api/results', async (req, res) => {
  const payload = req.body;

  if (!payload || !payload.userName || !payload.theme || typeof payload.score !== 'number') {
    return res.status(400).json({ error: 'Datos inválidos' });
  }

  const resultItem = {
    id: payload.id || (crypto.randomUUID ? crypto.randomUUID() : `r-${Date.now()}`),
    userName: payload.userName,
    theme: payload.theme,
    themeLabel: payload.themeLabel || payload.theme,
    correct: Number(payload.correct) || 0,
    wrong: Number(payload.wrong) || 0,
    score: Number(payload.score) || 0,
    createdAt: payload.createdAt || new Date().toISOString()
  };

  try {
    await saveResult(resultItem);
    const all = await getAllResults();
    const ranked = sortAndRank(all);
    res.status(201).json(ranked);
  } catch (err) {
    res.status(500).json({ error: 'Error al registrar resultado' });
  }
});

app.get('/{*splat}', (_req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// En Vercel no se llama a app.listen; Vercel usa la exportación como Serverless Function
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Servidor Nodo Lab corriendo en http://localhost:${PORT}`);
  });
}

export default app;
