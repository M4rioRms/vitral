// GET /api/preview?title=...&artist=...
//
// Devuelve el adelanto de 30 segundos de la canción usando la API de búsqueda de
// Apple (iTunes Search), que es pública, sin clave y está pensada para esto.
//
// Por qué no Spotify: desde noviembre de 2024 el campo preview_url llega vacío
// para las apps nuevas, y el SDK de reproducción exige Premium y que cada oyente
// esté autorizado en la app.

const BASE = 'https://itunes.apple.com/search';

function norm(s) {
  return String(s || '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')   // fuera acentos
    .replace(/\(.*?\)|\[.*?\]/g, '')                    // fuera "(feat. X)"
    .replace(/[^a-z0-9]/g, '');
}

module.exports = async (req, res) => {
  const title = String(req.query.title || '').trim();
  const artist = String(req.query.artist || '').trim();
  const country = String(req.query.country || process.env.SPOTIFY_MARKET || 'MX');
  if (!title) return res.status(400).json({ error: 'falta title' });

  const first = artist.split(',')[0].trim();
  const term = (first ? first + ' ' : '') + title;

  try {
    const url = BASE + '?media=music&entity=song&limit=12'
      + '&country=' + encodeURIComponent(country)
      + '&term=' + encodeURIComponent(term);

    const r = await fetch(url, { headers: { 'User-Agent': 'Vitral/1.0' } });
    if (!r.ok) return res.status(r.status).json({ error: 'itunes ' + r.status });

    const j = await r.json();
    const results = (j.results || []).filter(x => x && x.previewUrl);
    if (!results.length) return res.status(404).json({ error: 'sin adelanto' });

    // preferimos el que coincide de verdad en título y artista
    const wantT = norm(title), wantA = norm(first);
    const scored = results.map(x => {
      const t = norm(x.trackName), a = norm(x.artistName);
      let score = 0;
      if (t === wantT) score += 4; else if (t.includes(wantT) || wantT.includes(t)) score += 2;
      if (wantA && (a.includes(wantA) || wantA.includes(a))) score += 3;
      return { x, score };
    }).sort((p, q) => q.score - p.score);

    const best = scored[0];
    if (!best || best.score < 2) return res.status(404).json({ error: 'sin coincidencia' });

    const t = best.x;
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800');
    res.status(200).json({
      url: t.previewUrl,
      title: t.trackName,
      artist: t.artistName,
      seconds: 30,
      link: t.trackViewUrl || null
    });
  } catch (e) {
    res.status(502).json({ error: String(e && e.message || e) });
  }
};
