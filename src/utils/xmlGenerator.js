// src/utils/xmlGenerator.js

function normalizeResult(raw) {
  if (!raw) return "";

  const r = String(raw)
    .trim()
    .replace(/\u00BD/g, "1/2") // replace real ½ with "1/2"
    .replace(/\s+/g, "")
    .replace(/–/g, "-") // fix unicode dashes
    .toLowerCase();

  // Standard results
  if (r === "1-0") return "1-0";
  if (r === "0-1") return "0-1";
  if (r === "1/2-1/2" || r === "1/2" || r === "draw") return "½-½";

  // Forfeits
  if (r === "1-0f" || r === "1f-0f") return "1-0F";
  if (r === "0-1f" || r === "0f-1f") return "0-1F";
  if (r === "0-0f" || r === "0f-0f") return "0-0F";

  // Numeric mapping (Swiss-Manager internal)
  switch (r) {
    case "1": return "1-0";
    case "2": return "½-½";
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
