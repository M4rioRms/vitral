// POST /api/design   { prompt: "..." }
//
// Pide a Claude las tres propuestas de diseño y devuelve el JSON ya parseado.
// La clave vive solo aquí; nunca llega al navegador.
//
// Necesita la variable de entorno ANTHROPIC_API_KEY.
// Se saca en https://console.anthropic.com  (Settings → API keys).
// Ojo: cada generación consume créditos de tu cuenta.

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'usa POST' });

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(501).json({ error: 'falta ANTHROPIC_API_KEY' });

  let prompt = '';
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    prompt = String(body.prompt || '');
  } catch (e) {
    return res.status(400).json({ error: 'cuerpo inválido' });
  }
  if (!prompt || prompt.length > 6000) return res.status(400).json({ error: 'prompt inválido' });

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2000,
        temperature: 1,
        system: 'Eres director de arte. Respondes únicamente con JSON válido, ' +
                'sin markdown, sin explicaciones y sin texto alrededor.',
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!r.ok) {
      const t = await r.text();
      return res.status(r.status).json({ error: 'anthropic ' + r.status, detail: t.slice(0, 300) });
    }

    const j = await r.json();
    const txt = (j.content || [])
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('')
      .replace(/```json|```/g, '')
      .trim();

    let designs;
    try {
      designs = JSON.parse(txt);
    } catch (e) {
      const m = txt.match(/\[[\s\S]*\]/);          // por si se le escapa algo alrededor
      if (!m) return res.status(502).json({ error: 'respuesta no parseable' });
      designs = JSON.parse(m[0]);
    }

    if (!Array.isArray(designs)) designs = designs.designs || [];
    res.status(200).json({ designs: designs.slice(0, 3) });
  } catch (e) {
    res.status(502).json({ error: String(e && e.message || e) });
  }
};
