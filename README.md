# Vitral

Tarjetas de letras con estilo. La portada manda: de ella salen los colores del fondo.

## Qué hace

- Buscador en vivo de canciones (autocompletado mientras escribes)
- Portada automática desde Spotify, y paleta de color extraída de esa portada
- Botón "Sin ideas" con sugerencias
- 11 estilos de tarjeta: Vidrio, Almohada, Cartel, Plastilina, Neón, Aire, Casete, Vinilo, Aurora, Ficha, Cuero
- 5 tipografías y 4 tamaños
- Selector de líneas: pegas la letra y eliges qué renglones van en la tarjeta
- Exporta un PNG a triple resolución

Letras vía Musixmatch (opcional). Con `MUSIXMATCH_KEY` configurada aparece el
botón "Traer letra de la canción" dentro del panel de Letra. Sin la clave, la
letra se pega a mano y todo lo demás funciona igual.

## Archivos

```
index.html        la app entera
api/_token.js     token de Spotify (Client Credentials), cacheado
api/search.js     GET /api/search?q=...
api/popular.js    GET /api/popular
api/cover.js      GET /api/cover?u=...  proxy de portadas
api/lyrics.js     GET /api/lyrics?title=...&artist=...
api/health.js     GET /api/health
```

Si no hay backend, `index.html` funciona igual en modo manual: escribes el título
a mano y subes la portada desde tu galería.

## Desplegar en Vercel

1. **Credenciales de Spotify**
   - Entra a https://developer.spotify.com/dashboard y crea una app.
   - Copia el *Client ID* y el *Client Secret*.
   - Desde febrero de 2026, el dueño de la app necesita **Spotify Premium** o la app deja de funcionar.

2. **Sube el código a GitHub**
   - Crea un repo nuevo y sube esta carpeta (desde la web: *Add file → Upload files*).

3. **Importa en Vercel**
   - https://vercel.com → *Add New → Project* → elige el repo.
   - En *Settings → Environment Variables* añade:
     - `SPOTIFY_ID` = tu Client ID
     - `SPOTIFY_SECRET` = tu Client Secret
     - `SPOTIFY_MARKET` = `MX` (opcional, el país para los resultados)
     - `MUSIXMATCH_KEY` = tu clave de Musixmatch (opcional, para las letras)
   - Deploy.

4. **Comprueba** que `https://tu-proyecto.vercel.app/api/health` responda
   `{"spotify":true}`. Si dice `false`, el mensaje de error te dice qué falta.

El secret nunca llega al navegador: vive en las variables de entorno y solo lo usan
las funciones del servidor.

## Detalles que importan

**Por qué existe `api/cover.js`.** Las portadas se sirven desde `i.scdn.co`. Si la
página las carga directo desde ahí, el navegador marca el canvas como contaminado y
se rompen dos cosas: leer los píxeles para sacar la paleta, y exportar el PNG. El
proxy las sirve desde tu propio dominio y el problema desaparece.

**Por qué las populares son una lista manual.** Spotify eliminó los endpoints de
charts: Featured Playlists y Category Playlists en noviembre de 2024, y
`GET /browse/new-releases` más el campo `popularity` en febrero de 2026. Las
playlists editoriales de Spotify ya no devuelven sus canciones. Edita el array
`SEEDS` en `api/popular.js` con lo que quieras sugerir; cada título se busca en
Spotify para traer datos y portada reales.

**Límite de resultados.** Desde febrero de 2026 `/search` devuelve como máximo 10.

**Client Credentials.** En el anuncio de febrero de 2026 Spotify dijo que se están
alejando de este flujo para endpoints de metadatos. Hoy funciona para `/search`,
pero si algún día empieza a dar 401 o 403, habría que migrar a login de usuario
(Authorization Code + PKCE).

**Modo desarrollo.** Una app nueva está limitada: un Client ID por desarrollador y
cinco usuarios autorizados. Para uso personal sobra; para abrirla al público
necesitarías cuota extendida, que Spotify solo da a organizaciones con 250k
usuarios activos al mes.

## Alternativas si Spotify te cierra la puerta

Deezer y MusicBrainz + Cover Art Archive tienen APIs de metadatos y portadas más
abiertas. La estructura de `api/search.js` es la misma; solo cambia la URL y el
mapeo de campos.

## Letras

La clave se saca en https://developer.musixmatch.com, registrándote y creando una
app. Añádela como `MUSIXMATCH_KEY` en Vercel y redespliega.

Qué da el plan gratuito:

- Alrededor de 2.000 llamadas al día
- Un **extracto** de cada letra, no la letra completa (aproximadamente el 30%).
  Para una tarjeta de dos o tres renglones sobra.
- Obliga a mostrar el aviso de copyright y a cargar su script de seguimiento.
  `api/lyrics.js` devuelve ambos y la página los usa: el aviso sale bajo el
  cuadro de texto y el script se inyecta al mostrar la letra.
- Es para uso personal y de desarrollo. Para algo comercial hace falta contratar
  su plan con licencia.

`/api/lyrics` primero resuelve la canción exacta con `matcher.track.get` usando
título y artista, y luego pide el extracto con `track.lyrics.get`. Si la canción
no tiene letra en su catálogo devuelve 404 y la app te deja pegarla a mano.

Circulan librerías que usan una "community key" sacada de ingeniería inversa para
obtener letras completas gratis. Eso se salta la licencia; no está en este
proyecto y no te lo recomiendo.
