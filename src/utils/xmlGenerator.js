// src/utils/xmlGenerator.js

/**
 * Normalizes result strings to Swiss-Manager compatible format.
 * IMPORTANT: Swiss-Manager ONLY accepts these exact formats:
 * - "1-0" for white win
 * - "0-1" for black win
 * - "1/2" for draw (NOT "½-½" or "1/2-1/2")
 * - "1-0F", "0-1F", "0-0F" for forfeits
 */
function normalizeResult(raw) {
  if (!raw) return "";

  const r = String(raw)
    .trim()
    .replace(/\u00BD/g, "1/2") // replace real ½ with "1/2"
    .replace(/\s+/g, "")
    .replace(/–/g, "-") // fix unicode dashes
    .toLowerCase();

  // Standard results - Swiss-Manager format
  if (r === "1-0") return "1-0";
  if (r === "0-1") return "0-1";

  // ✅ CRITICAL: Swiss-Manager ONLY accepts "1/2" for draws
  if (r === "1/2-1/2" || r === "1/2" || r === "draw" || r === "½-½" || r === "1/2/1/2") {
    return "1/2";
  }

  // Forfeits
  if (r === "1-0f" || r === "1f-0f") return "1-0F";
  if (r === "0-1f" || r === "0f-1f") return "0-1F";
  if (r === "0-0f" || r === "0f-0f") return "0-0F";

  // Numeric mapping (Swiss-Manager internal codes)
  switch (r) {
    case "1": return "1-0";
    case "2": return "1/2";  // ✅ Fixed: was "½-½"
    case "3": return "0-1";
    case "4": return "1-0F";
    case "5": return "0-1F";
    case "6": return "0-0F";
    default: return "";
  }
}

function generateXML(round, results) {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<Results>\n';

  results.forEach((r) => {
    // skip if we don't have SNo (Swiss-Manager can’t import without SNo)
    if (!r.whiteSNo || !r.blackSNo) return;

    const result = normalizeResult(r.result);
    if (!result) return;

    xml += `  <Result Round="${round}" PlayerWhiteSNo="${r.whiteSNo}" PlayerBlackSNo="${r.blackSNo}" Res="${result}" />\n`;
  });

  xml += "</Results>";
  return xml;
}

module.exports = generateXML;
