// GET /api/genius?title=...&artist=...
//
// Usa la API oficial de Genius SOLO para resolver la URL de la canción.
// Devuelve metadatos (título, artista, enlace), nunca la letra: la API de
// Genius no expone el texto de las letras, y así debe quedarse.
//
// Necesita GENIUS_TOKEN. Se saca en https://genius.com/api-clients
// creando un cliente y generando un "Client Access Token".

module.exports = async (req, res) => {
  const token = process.env.GENIUS_TOKEN;
  if (!token) return res.status(501).json({ error: 'sin GENIUS_TOKEN' });

  const title = String(req.query.title || '').trim();
  const artist = String(req.query.artist || '').trim();
  if (!title) return res.status(400).json({ error: 'falta title' });

  // solo el primer artista: los featuring confunden la búsqueda
  const first = artist.split(',')[0].trim();
  const q = (first ? first + ' ' : '') + title;

  try {
    const r = await fetch('https://api.genius.com/search?q=' + encodeURIComponent(q), {
      headers: { Authorization: 'Bearer ' + token }
    });
    if (!r.ok) return res.status(r.status).json({ error: 'genius ' + r.status });

    const j = await r.json();
    const hits = (j.response && j.response.hits) || [];
    const songs = hits.filter(h => h.type === 'song' && h.result && h.result.url);
    if (!songs.length) return res.status(404).json({ error: 'no encontrada' });

    // preferimos el resultado cuyo artista coincide de verdad
    const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const want = norm(first);
    const best = songs.find(h => want && norm(h.result.primary_artist &&
      h.result.primary_artist.name).includes(want.slice(0, 8))) || songs[0];

    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800');
    res.status(200).json({
      url: best.result.url,
      title: best.result.title,
      artist: best.result.primary_artist ? best.result.primary_artist.name : ''
    });
  } catch (e) {
    res.status(502).json({ error: String(e && e.message || e) });
  }
};
