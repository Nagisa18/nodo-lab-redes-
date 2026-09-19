import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

export default async function handler(req, res) {
  // Encabezados CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({
      error: 'Variables SUPABASE_URL o SUPABASE_ANON_KEY no configuradas en el servidor.'
    });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // ─── GET: Obtener ranking ───────────────────────────────────────────────
  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase.from('results').select('*');
      if (error) {
        return res.status(500).json({ error: error.message });
      }
      const ranked = (data || [])
        .sort((a, b) => b.score - a.score || a.wrong - b.wrong || (a.userName || '').localeCompare(b.userName || ''))
        .map((entry, index) => ({ ...entry, position: index + 1 }));

      return res.status(200).json(ranked);
    } catch (err) {
      return res.status(500).json({ error: 'Error al consultar Supabase' });
    }
  }

  // ─── POST: Guardar resultado ────────────────────────────────────────────
  if (req.method === 'POST') {
    try {
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
        createdAt: payload.createdAt || new Date().toISOString()
      };

      const { error: insertError } = await supabase.from('results').insert([resultItem]);
      if (insertError) {
        console.error('Insert error:', insertError);
        return res.status(500).json({ error: insertError.message });
      }

      const { data, error: fetchError } = await supabase.from('results').select('*');
      if (fetchError) {
        return res.status(500).json({ error: fetchError.message });
      }

      const ranked = (data || [])
        .sort((a, b) => b.score - a.score || a.wrong - b.wrong || (a.userName || '').localeCompare(b.userName || ''))
        .map((entry, index) => ({ ...entry, position: index + 1 }));

      return res.status(201).json(ranked);
    } catch (err) {
      return res.status(500).json({ error: 'Error al guardar en Supabase' });
    }
  }

  // ─── DELETE: Eliminar registro(s) ───────────────────────────────────────
  if (req.method === 'DELETE') {
    try {
      const { id } = req.query;
      if (!id) {
        return res.status(400).json({ error: 'ID requerido' });
      }

      if (id === 'all') {
        await supabase.from('results').delete().neq('id', '');
      } else {
        await supabase.from('results').delete().eq('id', id);
      }

      const { data } = await supabase.from('results').select('*');
      const ranked = (data || [])
        .sort((a, b) => b.score - a.score || a.wrong - b.wrong || (a.userName || '').localeCompare(b.userName || ''))
        .map((entry, index) => ({ ...entry, position: index + 1 }));

      return res.status(200).json(ranked);
    } catch (err) {
      return res.status(500).json({ error: 'Error al eliminar en Supabase' });
    }
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
