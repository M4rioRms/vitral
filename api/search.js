// GET /api/search?q=texto
// Busca canciones en Spotify y devuelve título, artistas, año y portada.
// El client secret vive solo aquí, nunca en el HTML.

const { getToken } = require('./_token');

module.exports = async (req, res) => {
  const q = String(req.query.q || '').trim();
  const market = String(req.query.market || process.env.SPOTIFY_MARKET || 'MX');

  if (!q) return res.status(400).json({ error: 'falta q' });

  try {
    const token = await getToken();
    // Ojo: desde febrero de 2026 el máximo de 'limit' en /search es 10.
    const url = 'https://api.spotify.com/v1/search?type=track&limit=10'
      + '&market=' + encodeURIComponent(market)
      + '&q=' + encodeURIComponent(q);

    const r = await fetch(url, { headers: { Authorization: 'Bearer ' + token } });

    if (!r.ok) {
      const body = await r.text();
      return res.status(r.status).json({ error: 'spotify', status: r.status, body: body.slice(0, 400) });
    }

    const data = await r.json();
    const items = (data.tracks && data.tracks.items ? data.tracks.items : [])
      .filter(Boolean)
      .map(t => {
        const imgs = (t.album && t.album.images) || [];
        const big = imgs[0] ? imgs[0].url : null;
        return {
          id: t.id,
          title: t.name,
          artists: (t.artists || []).map(a => a.name).join(', '),
          year: ((t.album && t.album.release_date) || '').slice(0, 4),
          // se sirve por nuestro proxy para que el canvas no quede "tainted"
          cover: big ? '/api/cover?u=' + encodeURIComponent(big) : null
        };
      });

    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=86400');
    res.status(200).json({ items });
  } catch (e) {
    res.status(500).json({ error: String(e && e.message || e) });
  }
};
