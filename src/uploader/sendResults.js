// backend/src/uploader/sendResults.js
const axios = require('axios');

/**
 * Sends results directly to Chess-Results via POST.
 * This is the “live upload” alternative to XML export.
 *
 * payload looks like:
 * {
 *   dbKey: "12345",
 *   sidKey: "ABCDE",
 *   round: "3",
 *   results: [
 *      { board: 1, result: "1-0" },
 *      { board: 2, result: "½-½" },
 *      ...
 *   ]
 * }
 */
async function sendResults({ dbKey, sidKey, round, results }) {
  try {
    if (!dbKey || !sidKey || !round || !results) {
      throw new Error("Missing required fields (dbKey, sidKey, round, results)");
    }

    // Build Chess-Results style payload
    const payload = {
      Database: dbKey,
      SID: sidKey,
      Round: round,
      Results: results,
    };

    console.log("⬆️ Sending results to Chess-Results...");
    console.log(payload);

    const url = `https://chess-results.com/Results.aspx`;

    const response = await axios.post(
      url,
      payload,
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      }
    );

    console.log("✅ Results uploaded to Chess-Results successfully!");
    return { success: true, html: response.data };

  } catch (err) {
    console.error("❌ Error uploading results:", err.message);
    return { success: false, error: err.message };
  }
}

module.exports = sendResults;
