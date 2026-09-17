// GET /api/popular
// Sugerencias para cuando no sabes qué poner.
//
// Importante: Spotify RETIRÓ los endpoints de charts. En noviembre de 2024 se
// fueron Featured Playlists y Category Playlists, y en febrero de 2026 también
// GET /browse/new-releases y el campo "popularity" de las canciones. Tampoco se
// pueden leer las pistas de las playlists editoriales de Spotify.
// O sea: ya no hay forma oficial de pedir "lo más sonado".
//
// Así que la lista de abajo la mandas tú, y cada título se busca en Spotify
// para traer los datos reales y la portada. Edita SEEDS cuando quieras.

const { getToken } = require('./_token');

const ALL_SEEDS = [
  'Santa Rvssian Rauw Alejandro',
  'DtMF Bad Bunny',
  'Die With A Smile Lady Gaga Bruno Mars',
  'Ordinary Alex Warren',
  'Not Like Us Kendrick Lamar',
  'Si Antes Te Hubiera Conocido Karol G',
  'BIRDS OF A FEATHER Billie Eilish',
  'La Plena W Sound 05 Beéle',
  'Golden HUNTR/X KPop Demon Hunters',
  'APT. ROSÉ Bruno Mars',
  'Soltera Shakira',
  'Espresso Sabrina Carpenter'
];

module.exports = async (req, res) => {
  const market = String(req.query.market || process.env.SPOTIFY_MARKET || 'MX');

  try {
    const token = await getToken();

    // 5 al azar en cada visita, para que no salga siempre lo mismo
    const SEEDS = [...ALL_SEEDS].sort(() => Math.random() - 0.5).slice(0, 5);

    const results = await Promise.all(SEEDS.map(async (seed) => {
      try {
        const url = 'https://api.spotify.com/v1/search?type=track&limit=1'
          + '&market=' + encodeURIComponent(market)
          + '&q=' + encodeURIComponent(seed);
        const r = await fetch(url, { headers: { Authorization: 'Bearer ' + token } });
        if (!r.ok) return null;
        const j = await r.json();
        const t = j.tracks && j.tracks.items && j.tracks.items[0];
        if (!t) return null;
        const imgs = (t.album && t.album.images) || [];
        return {
          id: t.id,
          title: t.name,
          artists: (t.artists || []).map(a => a.name).join(', '),
          year: ((t.album && t.album.release_date) || '').slice(0, 4),
          cover: imgs[0] ? '/api/cover?u=' + encodeURIComponent(imgs[0].url) : null
        };
      } catch (e) { return null; }
    }));

    const items = results.filter(Boolean);
    res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=86400');
    res.status(200).json({ items });
  } catch (e) {
    res.status(500).json({ error: String(e && e.message || e) });
  }
};
