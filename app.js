import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import postRoutes from "./routes/postRoutes.js";
import mcpRoutes from "./routes/mcpRoutes.js";

dotenv.config();

const app = express();

// Standard Middlewares
app.use(cors({
  origin: "*", // Keep it open for local development and extension usage
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "mcp-session-id"],
  exposedHeaders: ["mcp-session-id"]
}));

app.use(express.urlencoded({ extended: true, limit: "15mb" }));
app.use(express.json({ limit: "15mb" }));

// Mount Routes
app.use("/api/posts", postRoutes);
app.use("/mcp", mcpRoutes);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "LinkedIn Post MCP Server is healthy",
    timestamp: new Date().toISOString()
  });
});

// Undefined Route Handler
app.use("*", (req, res) => {
  res.status(404).json({
    status: "error",
    message: `Can't find ${req.originalUrl} on this server`
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("🔥 Error caught by middleware:", err);
  res.status(err.statusCode || 500).json({
    status: "error",
    message: err.message || "Internal server error"
  });
});

export default app;
