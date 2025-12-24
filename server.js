require("dotenv").config();
const express = require("express");
const cors = require("cors");
const routes = require("./src/routes");
const { connectDB } = require("./src/utils/db");

const app = express();

/* ===============================
   🔐 CORS CONFIGURATION (FIXED)
   =============================== */

const allowedOrigins = [
  process.env.FRONTEND_URL,        // Production frontend (Render)
  "http://localhost:5173",         // Vite dev
  "http://localhost:3000",         // Alternate dev
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow server-to-server, Postman, curl, etc.
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.warn(`⚠️ Blocked CORS request from: ${origin}`);
    return callback(null, false); // DO NOT throw error
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

// Apply CORS
app.use(cors(corsOptions));

// Explicitly handle preflight requests
app.options("*", cors(corsOptions));

/* ===============================
   🧠 MIDDLEWARES
   =============================== */

app.use(express.json());

/* ===============================
   📡 ROUTES
   =============================== */

app.use("/api", routes);

/* ===============================
   🗄️ DATABASE
   =============================== */

connectDB();

/* ===============================
   🚀 SERVER START
   =============================== */

const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || "development";

app.listen(PORT, () => {
  console.log(`✅ Backend running on port ${PORT}`);
  console.log(`📍 Environment: ${NODE_ENV}`);
  console.log(`🔗 Allowed origins:`, allowedOrigins.filter(Boolean));
});
