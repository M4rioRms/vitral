// GET /api/cover?u=<url de la portada>
// Sirve la imagen desde nuestro propio dominio. Es lo que permite leer sus
// píxeles para sacar la paleta y exportar el PNG: una imagen de otro dominio
// "ensucia" el canvas y el navegador bloquea getImageData y toBlob.

const ALLOWED = /^([a-z0-9-]+\.)?scdn\.co$/i;

module.exports = async (req, res) => {
  const u = String(req.query.u || '');
  let url;
  try { url = new URL(u); } catch (e) { return res.status(400).send('url inválida'); }

  if (url.protocol !== 'https:' || !ALLOWED.test(url.hostname)) {
    return res.status(400).send('dominio no permitido');
  }

  try {
    const r = await fetch(url.toString());
    if (!r.ok) return res.status(r.status).send('no disponible');

    const buf = Buffer.from(await r.arrayBuffer());
    res.setHeader('Content-Type', r.headers.get('content-type') || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=604800, immutable');
    res.status(200).send(buf);
  } catch (e) {
    res.status(500).send('error');
  }
};
