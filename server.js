require("dotenv").config();
const express = require("express");
const cors = require("cors");
const routes = require("./src/routes");
const { connectDB } = require("./src/utils/db");

const app = express();

// ⚡ Production-ready CORS configuration
const allowedOrigins = [
  process.env.FRONTEND_URL, // Production frontend URL (e.g., https://frontend.onrender.com)
  'http://localhost:5173',  // Vite dev server
  'http://localhost:3000',  // Alternative local dev port
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin) {
      return callback(null, true);
    }

    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`⚠️ Blocked CORS request from: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json());

// API routes
app.use("/api", routes);

// Connect database
connectDB();

const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

app.listen(PORT, () => {
  console.log(`✅ Backend running on port ${PORT}`);
  console.log(`📍 Environment: ${NODE_ENV}`);
  console.log(`🔗 Allowed origins:`, allowedOrigins.filter(Boolean));
});
