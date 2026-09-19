import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataFile = path.join(__dirname, '..', 'results.json');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

function sortAndRank(list) {
  return [...list]
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || (a.wrong ?? 0) - (b.wrong ?? 0) || (a.userName || '').localeCompare(b.userName || ''))
    .map((entry, index) => ({ ...entry, position: index + 1 }));
}

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
    console.error('Error escribiendo results.json local:', err);
  }
}

async function getAllResults() {
  if (supabaseUrl && supabaseKey) {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data, error } = await supabase.from('results').select('*');
    if (error) throw error;
    return data || [];
  }

  return readResultsLocal();
}

async function saveResult(resultItem) {
  if (supabaseUrl && supabaseKey) {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { error } = await supabase.from('results').insert([resultItem]);
    if (error) throw error;
    return;
  }

  const current = readResultsLocal();
  writeResultsLocal([...current, resultItem]);
}

async function deleteResultById(id) {
  if (supabaseUrl && supabaseKey) {
    const supabase = createClient(supabaseUrl, supabaseKey);
    if (id === 'all') {
      await supabase.from('results').delete().neq('id', '');
    } else {
      await supabase.from('results').delete().eq('id', id);
    }
    return;
  }

  const current = readResultsLocal();
  const filtered = id === 'all' ? [] : current.filter((item) => item.id !== id);
  writeResultsLocal(filtered);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      const all = await getAllResults();
      return res.status(200).json(sortAndRank(all));
    }

    if (req.method === 'POST') {
      const payload = req.body;
      if (!payload || !payload.userName || typeof payload.score !== 'number') {
        return res.status(400).json({ error: 'Datos inválidos' });
      }

      const resultItem = {
        id: payload.id || `r-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        userName: payload.userName,
        theme: payload.theme,
        themeLabel: payload.themeLabel || payload.theme,
        correct: Number(payload.correct) || 0,
        wrong: Number(payload.wrong) || 0,
        score: Number(payload.score) || 0,
        createdAt: payload.createdAt || new Date().toISOString(),
      };

      await saveResult(resultItem);
      const all = await getAllResults();
      return res.status(201).json(sortAndRank(all));
    }

    if (req.method === 'DELETE') {
      const { id } = req.query || {};
      if (!id) {
        return res.status(400).json({ error: 'ID requerido' });
      }

      await deleteResultById(id);
      const all = await getAllResults();
      return res.status(200).json(sortAndRank(all));
    }

    return res.status(405).json({ error: 'Método no permitido' });
  } catch (err) {
    console.error('API error:', err);
    return res.status(500).json({ error: err?.message || 'Error interno del servidor' });
  }
}
