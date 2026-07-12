import dotenv from "dotenv";
import app from "./app.js";
import connectDB from "./config/db.js";
import { createMcpServer } from "./config/mcpConfig.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

dotenv.config();

const PORT = Number(process.env.PORT) || 8081;
const useStdio = process.argv.includes("--stdio") || process.env.MCP_TRANSPORT === "stdio";

(async () => {
  try {
    // 1. Establish database connection first
    await connectDB();

    if (useStdio) {
      // Direct Stdio MCP transport setup
      // Important: redirect console.log/info to console.error (stderr) so it doesn't pollute the MCP stdout transport
      console.log = (...args) => console.error("[STDOUT_REDIRECT]", ...args);
      console.info = (...args) => console.error("[STDOUT_REDIRECT]", ...args);

      const mcpServer = createMcpServer();
      const transport = new StdioServerTransport();
      await mcpServer.connect(transport);
      
      console.error("🚀 LinkedInPostMCP Server is running in STDIO mode");
    } else {
      // HTTP/SSE server boot
      const server = app.listen(PORT, () => {
        console.log(`🚀 LinkedInPostMCP Server running on port ${PORT}`);
        console.log(`🌍 Environment: ${(process.env.NODE_ENV || "development").toUpperCase()}`);
      });

      const shutdown = async (signal) => {
        console.log(`\n🛑 Received ${signal}. Shutting down...`);
        server.close(() => {
          console.log("✅ HTTP server closed.");
          process.exit(0);
        });
      };

      process.on("SIGINT", () => shutdown("SIGINT"));
      process.on("SIGTERM", () => shutdown("SIGTERM"));
    }

    process.on("uncaughtException", (err) => {
      console.error("🔥 Uncaught Exception:", err.message);
      if (useStdio) {
        process.exit(1);
      }
    });

    process.on("unhandledRejection", (err) => {
      console.error("🔥 Unhandled Rejection:", err.message);
      if (useStdio) {
        process.exit(1);
      }
    });

  } catch (error) {
    console.error("❌ Fatal startup error:", error);
    process.exit(1);
  }
})();
