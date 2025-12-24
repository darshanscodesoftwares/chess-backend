// const axios = require("axios");
// const cheerio = require("cheerio");

// async function fetchTournamentKeys(url) {
//   try {
//     const { data } = await axios.get(url);
//     const $ = cheerio.load(data);

//     const dbKey = $("#P1_txt_TNr").val()?.trim();
//     const sidKey = $("#P1_l_sid").text().trim().split("/")[0];
//     const round = $("#P1_txt_rd").val()?.trim(); // ⬅️ NEW ROUND SCRAPE

//     // Extract tournament metadata if available
//     let tournamentName = null;
//     let baseLink = null;

//     // TODO: Chess-Results HTML may change - verify selectors if scraping fails
//     // Check if this is a Stammdaten page (metadata page)
//     const h2Text = $("h2").first().text().trim();
//     if (h2Text && url.includes("Stammdaten")) {
//       tournamentName = h2Text;

//       // Extract and normalize base link from "Starting Rank" link
//       const startingRankLink = $('a.CRdb[href*="tnr"]').attr("href");
//       if (startingRankLink) {
//         // Normalize to canonical form
//         const match = startingRankLink.match(/tnr(\d+)\.aspx/);
//         if (match) {
//           const tnr = match[1];
//           baseLink = `https://s2.chess-results.com/tnr${tnr}.aspx?lan=1&art=0&turdet=YES&SNode=S0`;
//         }
//       }
//     }

//     return { dbKey, sidKey, round, tournamentName, baseLink };
//   } catch (err) {
//     console.error("❌ Error scraping keys:", err.message);
//     return null;
//   }
// }

// module.exports = fetchTournamentKeys;

const axios = require("axios");
const cheerio = require("cheerio");

async function fetchTournamentKeys(url) {
  try {
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    const dbKey = $("#P1_txt_TNr").val()?.trim();
    const sidKey = $("#P1_l_sid").text().trim().split("/")[0];
    const round = $("#P1_txt_rd").val()?.trim() || null;

    let tournamentName = null;
    let baseLink = null;

    const h2Text = $("h2").first().text().trim();
    if (h2Text && url.includes("Stammdaten")) {
      tournamentName = h2Text;

      const startingRankLink = $('a.CRdb[href*="tnr"]').attr("href");
      if (startingRankLink) {
        const match = startingRankLink.match(/tnr(\d+)\.aspx/);
        if (match) {
          const tnr = match[1];
          baseLink = `https://s2.chess-results.com/tnr${tnr}.aspx?lan=1&art=0&turdet=YES&SNode=S0`;
        }
      }
    }

    return { dbKey, sidKey, round, tournamentName, baseLink };
  } catch (err) {
    console.error("❌ Error scraping keys:", err.message);
    return null;
  }
}

module.exports = fetchTournamentKeys;
