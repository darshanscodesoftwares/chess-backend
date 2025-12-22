const mongoose = require("mongoose");

const ArbiterSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: String,
    phone: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Arbiter", ArbiterSchema);
