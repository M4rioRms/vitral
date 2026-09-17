// GET /api/health
// La página lo llama al abrir: si responde spotify:true usa la API real,
// y si no, se queda en modo manual. También sirve para diagnosticar.

const { getToken } = require('./_token');

module.exports = async (req, res) => {
  try {
    await getToken();
    res.status(200).json({
      spotify: true,
      lyrics: !!process.env.MUSIXMATCH_KEY,
      genius: !!process.env.GENIUS_TOKEN
    });
  } catch (e) {
    res.status(200).json({
      spotify: false,
      lyrics: !!process.env.MUSIXMATCH_KEY,
      genius: !!process.env.GENIUS_TOKEN,
      error: String(e && e.message || e)
    });
  }
};
