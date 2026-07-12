import express from "express";
import * as mcpController from "../controllers/mcpController.js";

const router = express.Router();

// Root metadata endpoint
router.get("/", (req, res) => {
  res.json({
    status: "ok",
    version: "1.0.0",
    protocol: "mcp",
    server: "LinkedInPostMCP Server",
    capabilities: {
      tools: [
        "generate_persona",
        "get_persona",
        "rate_and_rewrite",
        "get_author_posts",
        "save_persona"
      ],
      prompts: ["draft-linkedin-post"],
    }
  });
});

router.post("/", mcpController.handleHttpMcp);
router.delete("/", mcpController.handleMcpDelete);
router.get("/sse", mcpController.handleSse);
router.post("/message", mcpController.handleSseMessage);

export default router;
