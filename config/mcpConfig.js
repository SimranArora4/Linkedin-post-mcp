import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import Post from "../models/post.js";
import Persona from "../models/persona.js";
import * as geminiService from "../services/geminiService.js";

export function createMcpServer() {
  const mcp = new McpServer({
    name: "LinkedInPostMCP",
    version: "1.0.0",
  });

  // 1. Tool: generate_persona
  mcp.registerTool(
    "generate_persona",
    {
      description: "Fetches historical posts for a given author name from the DB, generates a writing style persona, saves it, and returns the persona analysis.",
      inputSchema: {
        authorName: z.string().describe("The name of the author to generate the style persona for (e.g., Bharat Pahwa)")
      }
    },
    async (args) => {
      const { authorName } = args;
      try {
        console.log(`[MCP] Tool: generate_persona called for "${authorName}"`);
        
        // Find posts by author
        const posts = await Post.find({
          "author.name": new RegExp(`^${authorName.trim()}$`, "i")
        });

        if (!posts || posts.length === 0) {
          return {
            isError: true,
            content: [
              {
                type: "text",
                text: `No synced posts found in database for author "${authorName}". Please ingest posts first.`
              }
            ]
          };
        }

        console.log(`[MCP] Found ${posts.length} posts for ${authorName}. Analyzing style...`);
        const personaText = await geminiService.generatePersonaFromPosts(posts);

        // Save or update persona
        await Persona.findOneAndUpdate(
          { authorName: new RegExp(`^${authorName.trim()}$`, "i") },
          { authorName: authorName.trim(), personaText },
          { upsert: true, new: true }
        );

        return {
          content: [
            {
              type: "text",
              text: `Successfully generated and saved style persona for "${authorName}":\n\n${personaText}`
            }
          ]
        };
      } catch (error) {
        console.error("Error in generate_persona tool:", error);
        return {
          isError: true,
          content: [{ type: "text", text: `Error: ${error.message}` }]
        };
      }
    }
  );

  // 2. Tool: get_persona
  mcp.registerTool(
    "get_persona",
    {
      description: "Retrieves the saved writing style persona for a given author name.",
      inputSchema: {
        authorName: z.string().describe("Name of the author to fetch the persona for")
      }
    },
    async (args) => {
      const { authorName } = args;
      try {
        console.log(`[MCP] Tool: get_persona called for "${authorName}"`);
        const persona = await Persona.findOne({
          authorName: new RegExp(`^${authorName.trim()}$`, "i")
        });

        if (!persona) {
          return {
            isError: true,
            content: [
              {
                type: "text",
                text: `No style persona found for "${authorName}". Please run the generate_persona tool first.`
              }
            ]
          };
        }

        return {
          content: [
            {
              type: "text",
              text: persona.personaText
            }
          ]
        };
      } catch (error) {
        console.error("Error in get_persona tool:", error);
        return {
          isError: true,
          content: [{ type: "text", text: `Error: ${error.message}` }]
        };
      }
    }
  );

  // 3. Tool: rate_and_rewrite
  mcp.registerTool(
    "rate_and_rewrite",
    {
      description: "Rates alignment of an AI-generated post with an author's persona, critiques it, and rewrites it to perfectly match the author's writing style.",
      inputSchema: {
        authorName: z.string().describe("The name of the author whose style to match"),
        aiGeneratedPost: z.string().describe("The AI-generated post that needs alignment check and style rewriting")
      }
    },
    async (args) => {
      const { authorName, aiGeneratedPost } = args;
      try {
        console.log(`[MCP] Tool: rate_and_rewrite called for "${authorName}"`);
        
        let persona = await Persona.findOne({
          authorName: new RegExp(`^${authorName.trim()}$`, "i")
        });

        // Auto-generation fallback: if persona doesn't exist, try to generate it
        if (!persona) {
          console.log(`[MCP] Persona not found for "${authorName}". Attempting auto-generation from synced posts...`);
          const posts = await Post.find({
            "author.name": new RegExp(`^${authorName.trim()}$`, "i")
          });

          if (!posts || posts.length === 0) {
            return {
              isError: true,
              content: [
                {
                  type: "text",
                  text: `No style persona exists for "${authorName}" and no posts are available to auto-generate one. Please ingest posts first.`
                }
              ]
            };
          }

          const personaText = await geminiService.generatePersonaFromPosts(posts);
          persona = await Persona.findOneAndUpdate(
            { authorName: new RegExp(`^${authorName.trim()}$`, "i") },
            { authorName: authorName.trim(), personaText },
            { upsert: true, new: true }
          );
          console.log(`[MCP] Auto-generated and saved style persona for "${authorName}"`);
        }

        const result = await geminiService.rateAndRewritePost(persona.personaText, aiGeneratedPost);

        const formattedResult = `
=== STYLE ALIGNMENT SCORE: ${result.matchingScore}/100 ===

=== CRITIQUE ===
${result.critique}

=== REWRITTEN POST (STYLE MATCHED) ===
${result.rewrittenPost}
`.trim();

        return {
          content: [
            {
              type: "text",
              text: formattedResult
            }
          ]
        };
      } catch (error) {
        console.error("Error in rate_and_rewrite tool:", error);
        return {
          isError: true,
          content: [{ type: "text", text: `Error: ${error.message}` }]
        };
      }
    }
  );

  // 5. Tool: get_author_posts
  mcp.registerTool(
    "get_author_posts",
    {
      description: "Fetches all text contents of the ingested posts for a given author to analyze their writing style.",
      inputSchema: {
        authorName: z.string().describe("The name of the author to retrieve posts for (e.g., Bharat Pahwa)")
      }
    },
    async (args) => {
      const { authorName } = args;
      try {
        console.log(`[MCP] Tool: get_author_posts called for "${authorName}"`);
        const posts = await Post.find({
          "author.name": new RegExp(`^${authorName.trim()}$`, "i")
        });

        if (!posts || posts.length === 0) {
          return {
            isError: true,
            content: [
              {
                type: "text",
                text: `No synced posts found in database for author "${authorName}".`
              }
            ]
          };
        }

        const formattedPosts = posts.map((p, idx) => {
          return `--- POST ${idx + 1} (${p.postedAround || "recent"}) ---\n${p.textContent || ""}\n`;
        }).join("\n");

        return {
          content: [
            {
              type: "text",
              text: formattedPosts
            }
          ]
        };
      } catch (error) {
        console.error("Error in get_author_posts tool:", error);
        return {
          isError: true,
          content: [{ type: "text", text: `Error: ${error.message}` }]
        };
      }
    }
  );

  // 6. Tool: save_persona
  mcp.registerTool(
    "save_persona",
    {
      description: "Saves or updates a custom style persona for a given author in the database.",
      inputSchema: {
        authorName: z.string().describe("The name of the author"),
        personaText: z.string().describe("The detailed writing persona profile text")
      }
    },
    async (args) => {
      const { authorName, personaText } = args;
      try {
        console.log(`[MCP] Tool: save_persona called for "${authorName}"`);
        
        const persona = await Persona.findOneAndUpdate(
          { authorName: new RegExp(`^${authorName.trim()}$`, "i") },
          { authorName: authorName.trim(), personaText },
          { upsert: true, new: true }
        );

        return {
          content: [
            {
              type: "text",
              text: `Successfully saved writing style persona for "${authorName}".`
            }
          ]
        };
      } catch (error) {
        console.error("Error in save_persona tool:", error);
        return {
          isError: true,
          content: [{ type: "text", text: `Error: ${error.message}` }]
        };
      }
    }
  );

  // 4. Prompt: draft-linkedin-post
  mcp.registerPrompt(
    "draft-linkedin-post",
    {
      authorName: z.string().describe("The name of the author style to use"),
      topic: z.string().describe("The topic or details you want to write about"),
    },
    async (args) => {
      const { authorName, topic } = args;
      
      let personaText = "Default professional, engaging tone. Use clear spacing and bullet points.";
      try {
        const persona = await Persona.findOne({
          authorName: new RegExp(`^${authorName.trim()}$`, "i")
        });
        if (persona) {
          personaText = persona.personaText;
        }
      } catch (err) {
        console.error("Failed to query persona for prompt template:", err);
      }

      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Please draft a LinkedIn post about "${topic}".

Write it in the style described by this persona:
${personaText}

Ensure you use their hook style, paragraph structure, emoji density, and overall tone. Output ONLY the drafted post without any conversational intro/outro.`,
            },
          },
        ],
      };
    }
  );

  return mcp;
}
