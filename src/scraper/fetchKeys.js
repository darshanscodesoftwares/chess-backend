const axios = require("axios");
const cheerio = require("cheerio");

async function fetchTournamentKeys(url) {
  try {
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    const dbKey = $("#P1_txt_TNr").val()?.trim();
    const sidKey = $("#P1_l_sid").text().trim().split("/")[0];
    const round = $("#P1_txt_rd").val()?.trim(); // ⬅️ NEW ROUND SCRAPE

    return { dbKey, sidKey, round };
  } catch (err) {
    console.error("❌ Error scraping keys:", err.message);
    return null;
  }
}

module.exports = fetchTournamentKeys;
