// GET /api/og?c=<estado codificado>
//
// Genera la imagen de vista previa que aparece al pegar el enlace en WhatsApp,
// Telegram, Discord o X. No guarda nada: todo el estado viaja en la URL.
//
// Se dibuja con @vercel/og (satori) usando nodos como objetos planos, para no
// necesitar JSX ni un paso de compilación.

import { ImageResponse } from '@vercel/og';

export const config = { runtime: 'edge' };

const W = 1200, H = 630;

function decode(c) {
  try {
    const b64 = c.replace(/-/g, '+').replace(/_/g, '/');
    const bin = atob(b64);
    const bytes = Uint8Array.from(bin, ch => ch.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch (e) {
    return null;
  }
}

// la fuente se resuelve una vez por instancia
let fontCache = null;
async function font(origin) {
  if (fontCache) return fontCache;
  try {
    const css = await fetch(
      'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600&display=swap',
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    ).then(r => r.text());
    const url = (css.match(/src:\s*url\(([^)]+)\)/) || [])[1];
    if (!url) return null;
    fontCache = await fetch(url).then(r => r.arrayBuffer());
    return fontCache;
  } catch (e) {
    return null;
  }
}

export default async function handler(req) {
  const { searchParams, origin } = new URL(req.url);
  const s = decode(searchParams.get('c') || '') || {};

  const tone = s.tone || {};
  const bg1 = tone.b1 || '#2a0140';
  const bg2 = tone.b2 || '#6c0ea8';
  const acc = tone.a || '#e93cff';

  const title = String(s.t || 'Vitral').slice(0, 70);
  const artists = String(s.a || '').slice(0, 90);
  const lines = String(s.l || '').split('\n').filter(Boolean).slice(0, 6);
  const cover = s.c ? (String(s.c).startsWith('http') ? s.c : origin + s.c) : null;

  const data = await font(origin);

  const node = {
    type: 'div',
    props: {
      style: {
        width: '100%', height: '100%', display: 'flex', alignItems: 'center',
        justifyContent: 'center', padding: '54px',
        backgroundColor: bg1,
        backgroundImage:
          `radial-gradient(120% 90% at 12% 0%, ${bg2} 0%, transparent 60%),` +
          `radial-gradient(80% 80% at 95% 100%, ${acc} 0%, transparent 62%)`,
        fontFamily: 'Space Grotesk, sans-serif'
      },
      children: [{
        type: 'div',
        props: {
          style: {
            display: 'flex', flexDirection: 'column', width: '100%', height: '100%',
            borderRadius: 34, padding: '44px 46px',
            backgroundColor: 'rgba(255,255,255,0.13)',
            border: '1px solid rgba(255,255,255,0.3)',
            color: 'rgba(255,255,255,0.97)'
          },
          children: [
            {
              type: 'div',
              props: {
                style: { display: 'flex', alignItems: 'center', gap: 22, marginBottom: 30 },
                children: [
                  cover ? {
                    type: 'img',
                    props: { src: cover, width: 92, height: 92, style: { borderRadius: 22 } }
                  } : {
                    type: 'div',
                    props: {
                      style: {
                        width: 92, height: 92, borderRadius: 22,
                        backgroundImage: `linear-gradient(135deg, ${acc}, ${bg2})`
                      }
                    }
                  },
                  {
                    type: 'div',
                    props: {
                      style: { display: 'flex', flexDirection: 'column' },
                      children: [
                        { type: 'div', props: { style: { fontSize: 34, fontWeight: 600 }, children: title } },
                        { type: 'div', props: { style: { fontSize: 23, opacity: 0.66, marginTop: 4 }, children: artists } }
                      ]
                    }
                  }
                ]
              }
            },
            {
              type: 'div',
              props: {
                style: {
                  display: 'flex', flexDirection: 'column', flex: 1,
                  fontSize: lines.length > 4 ? 38 : 46, lineHeight: 1.32, fontWeight: 600
                },
                children: lines.map(l => ({ type: 'div', props: { children: l.slice(0, 80) } }))
              }
            }
          ]
        }
      }]
    }
  };

  try {
    return new ImageResponse(node, {
      width: W,
      height: H,
      fonts: data ? [{ name: 'Space Grotesk', data, weight: 600, style: 'normal' }] : undefined,
      headers: { 'Cache-Control': 'public, max-age=86400, s-maxage=604800, immutable' }
    });
  } catch (e) {
    return new Response('og error: ' + (e && e.message), { status: 500 });
  }
}
