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
api/genius.js     GET /api/genius?title=...&artist=...  resuelve el enlace
api/health.js     GET /api/health
api/og.js         GET /api/og?c=...   imagen de vista previa de los enlaces
api/preview.js    GET /api/preview?title=...&artist=...  adelanto de 30 s
api/design.js     POST /api/design  las tres propuestas de Auto Design
manifest.json     PWA: instalable en la pantalla de inicio
sw.js             service worker: armazón y portadas sin conexión
icon-*.png        iconos de la app
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
     - `GENIUS_TOKEN` = tu Client Access Token de Genius (opcional, recomendado)
     - `ANTHROPIC_API_KEY` = tu clave de Anthropic (opcional, para Auto Design)
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

## El enlace a la letra

`GENIUS_TOKEN` hace que el botón "Abrir letra" caiga directo en la canción en vez
de en una página de resultados. Se saca en https://genius.com/api-clients: crea un
cliente (cualquier nombre y URL sirven) y genera un **Client Access Token**. Es
gratis e inmediato.

`api/genius.js` usa la API oficial solo para resolver la URL: pide `/search` con
título y artista y devuelve el enlace del mejor resultado. La API de Genius no
expone el texto de las letras, y este endpoint tampoco lo toca.

Sin el token todo sigue funcionando, solo que el botón abre la búsqueda de Genius
en lugar de la canción exacta.

## Instalable (PWA)

`manifest.json` y `sw.js` hacen que se pueda instalar en la pantalla de inicio y
que abra sin barra del navegador. El service worker guarda el armazón de la app y
las portadas ya vistas, así que el historial se sigue viendo sin conexión. Las
llamadas a `/api/` nunca se cachean.

Al publicar cambios, sube la versión en la constante `VERSION` de `sw.js` para que
los navegadores descarten la caché vieja.

## Foto de fondo

La foto **nunca sale del navegador**: no se sube a Vercel ni a ningún sitio. El
archivo se valida por tipo y tamaño (máximo 12 MB, solo PNG/JPG/WEBP/GIF), se
redibuja en un canvas —lo que descarta los metadatos EXIF, ubicación GPS incluida—
y se reduce a 1600 px como máximo.

En el panel de Diseño hay una vista previa con un recuadro punteado que marca lo
que entra según el formato elegido. Arrastrando dentro eliges qué parte de la foto
se ve, y hay controles de zoom y desenfoque. Como el recorte se calcula al
dibujar, una foto vertical funciona igual en formato Historia que en Tarjeta: solo
cambia la parte visible.

## Historial

Las últimas 8 tarjetas se guardan en `localStorage` con una miniatura, y aparecen
bajo la tarjeta. Al tocar una se restaura título, artistas, letra, estilo,
tipografía, tamaño, color y portada. No se guarda la foto de fondo, porque ocuparía
demasiado espacio.

## Enlaces compartibles

El botón "Copiar enlace" de la vista previa genera una URL con todo el estado
codificado en el parámetro `?c=`. No hay base de datos: la tarjeta viaja en el
propio enlace. Al abrirlo, la app se reconstruye sola.

`api/og.js` usa `@vercel/og` para dibujar la miniatura que muestran WhatsApp,
Telegram o Discord al pegar el enlace. Necesita que Vercel instale la dependencia
del `package.json`, cosa que hace sola al desplegar. Si esa función fallara, el
enlace sigue funcionando: solo se vería sin vista previa.

La foto de fondo no viaja en el enlace (sería enorme); sí el resto.

## Reproductor

Al elegir una canción aparece un reproductor con el adelanto de 30 segundos: disco
girando con la portada, barra de progreso y play/pausa.

El audio viene de la **API de búsqueda de Apple** (iTunes Search), que es pública,
no pide clave y sirve precisamente para esto. `api/preview.js` busca por título y
artista, puntúa los resultados y se queda con el que coincide de verdad, para no
acabar reproduciendo un remix ajeno o una canción de nombre parecido.

Por qué no Spotify: desde noviembre de 2024 el campo `preview_url` llega vacío
para las apps nuevas. El Web Playback SDK sí reproduce la canción completa, pero
exige que **cada oyente** tenga Premium y esté autorizado en la app, y en modo
desarrollo el límite es de cinco personas. Para compartir con amigos no sirve.

Si Apple no tiene la canción o no encuentra coincidencia clara, el reproductor
simplemente no aparece. El resto de la app funciona igual.

## Auto Design

El botón ✨ aparece en cuanto eliges una canción. La primera vez sale una ventana
preguntando si quieres probarlo; si dices que no, no vuelve a aparecer.

Cómo funciona de verdad, sin simulaciones: se arma un contexto con el nombre de la
canción, el artista, los cinco colores extraídos de la portada, cuántas líneas y
caracteres tiene el fragmento, la línea más larga, el idioma detectado y el formato
elegido. Con eso, la IA devuelve un array JSON de tres diseños con todos los
parámetros visuales: composición, portada, tipografía, color, fondo, efectos y
marco.

Ese JSON se traduce a un `spec`, que es la misma estructura que usan los 16 estilos
de la app. Por eso las propuestas se dibujan con el mismo motor que exporta el PNG:
lo que ves en la miniatura es exactamente lo que se aplica.

Tres redes de seguridad antes de pintar nada:

- **Saneado**: cada número se recorta a su rango válido y cada color se valida como
  hexadecimal. Si la IA devuelve basura, se usa el valor por defecto.
- **Ajuste de texto**: se mide el fragmento con la tipografía y el tamaño propuestos.
  Si no cabe en el formato elegido, baja el tamaño hasta que quepa. Si el fragmento
  es muy corto, lo sube.
- **Contraste**: se calcula la relación de luminancia entre el texto y el fondo. Si
  baja de 3.2, el color del texto se cambia a blanco o casi negro según convenga.

Dónde corre la IA: si la app se abre dentro de Claude, usa la capacidad de muestreo
del propio entorno. En tu despliegue usa `api/design.js`, que necesita
`ANTHROPIC_API_KEY`. Cada generación consume créditos de esa cuenta, así que tenlo
en cuenta antes de repartir el enlace.

Las direcciones estéticas (Auto, Minimal, Dark, Cinematic, Y2K, VHS, Glass,
Editorial, Phonk, Romantic, Luxury) viajan en el contexto: la IA las respeta pero
sigue decidiendo la composición por su cuenta.

"Aplicar" vuelca el diseño al editor, así que después puedes seguir tocando todo a
mano. "Regenerar" pide solo esa propuesta de nuevo.
