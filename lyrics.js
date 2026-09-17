// GET /api/lyrics?title=...&artist=...
//
// Letras vía Musixmatch, que es el proveedor licenciado. El plan gratuito
// devuelve un extracto (alrededor del 30% de la letra) y obliga a mostrar el
// aviso de copyright y a cargar su script de tracking cuando se muestra.
// Ambas cosas van en la respuesta para que la página cumpla.
//
// Necesita la variable de entorno MUSIXMATCH_KEY.
// Consíguela en https://developer.musixmatch.com

const BASE = 'https://api.musixmatch.com/ws/1.1/';

function clean(body) {
  return String(body || '')
    // marcas que Musixmatch añade al final del extracto
    .replace(/\*{3}[^*]*\*{3}/g, '')
    .replace(/^\(\d+\)$/gm, '')
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean);
}

module.exports = async (req, res) => {
  const key = process.env.MUSIXMATCH_KEY;
  if (!key) return res.status(501).json({ error: 'sin MUSIXMATCH_KEY' });

  const title = String(req.query.title || '').trim();
  const artist = String(req.query.artist || '').trim();
  if (!title) return res.status(400).json({ error: 'falta title' });

  const call = async (method, params) => {
    const qs = new URLSearchParams(Object.assign({ apikey: key, format: 'json' }, params));
    const r = await fetch(BASE + method + '?' + qs.toString());
    if (!r.ok) throw new Error(method + ' ' + r.status);
    const j = await r.json();
    const code = j.message && j.message.header && j.message.header.status_code;
    if (code !== 200) throw new Error(method + ' status ' + code);
    return j.message.body;
  };

  try {
    // 1. resolver la canción exacta
    const match = await call('matcher.track.get', {
      q_track: title,
      q_artist: artist || ''
    });
    const track = match && match.track;
    if (!track) return res.status(404).json({ error: 'canción no encontrada' });
    if (!track.has_lyrics) return res.status(404).json({ error: 'sin letra disponible' });

    // 2. traer el extracto
    const got = await call('track.lyrics.get', { track_id: track.track_id });
    const lyr = got && got.lyrics;
    if (!lyr || !lyr.lyrics_body) return res.status(404).json({ error: 'sin letra disponible' });

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    res.status(200).json({
      title: track.track_name,
      artist: track.artist_name,
      lines: clean(lyr.lyrics_body),
      partial: true,                       // el plan gratuito nunca da la letra completa
      copyright: lyr.lyrics_copyright || '',
      tracking: lyr.script_tracking_url || ''
    });
  } catch (e) {
    res.status(502).json({ error: String(e && e.message || e) });
  }
};
