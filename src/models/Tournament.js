// src/models/Tournament.js
const mongoose = require("mongoose");

const TournamentSchema = new mongoose.Schema(
  {
    dbKey: { type: String, required: true, unique: true, index: true },
    tournamentName: { type: String, required: true },
    baseLink: { type: String, required: true },
    sidKey: String, // Optional, may vary per round
  },
  { timestamps: true }
);

module.exports = mongoose.model("Tournament", TournamentSchema);
