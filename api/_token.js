// Token de aplicación (Client Credentials), cacheado en memoria de la función.
let cached = { token: null, exp: 0 };

async function getToken() {
  const now = Date.now();
  if (cached.token && now < cached.exp) return cached.token;

  const id = process.env.SPOTIFY_ID;
  const secret = process.env.SPOTIFY_SECRET;
  if (!id || !secret) throw new Error('Faltan SPOTIFY_ID / SPOTIFY_SECRET');

  const r = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Basic ' + Buffer.from(id + ':' + secret).toString('base64')
    },
    body: 'grant_type=client_credentials'
  });

  if (!r.ok) throw new Error('token ' + r.status + ': ' + (await r.text()).slice(0, 200));

  const j = await r.json();
  cached = { token: j.access_token, exp: now + (j.expires_in - 60) * 1000 };
  return cached.token;
}

module.exports = { getToken };
