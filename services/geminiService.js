import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

let genAI = null;
if (process.env.GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
} else {
  console.warn("⚠️  GEMINI_API_KEY is not defined in the environment variables. LLM functions will fall back to mock analysis.");
}

const getModel = (modelName = "gemini-2.5-flash") => {
  if (!genAI) return null;
  return genAI.getGenerativeModel({ model: modelName });
};

/**
 * Generates a writing persona analysis from a list of posts
 * @param {Array} posts 
 * @returns {Promise<string>}
 */
export const generatePersonaFromPosts = async (posts) => {
  if (!posts || posts.length === 0) {
    return "No posts available to generate persona.";
  }

  const model = getModel();
  if (!model) {
    return `[Mock Persona] Author writes punchy posts. Spacing: high. Emoji usage: moderate. Themes: Tech & development. (Configure GEMINI_API_KEY for real analysis)`;
  }

  // Format posts for the prompt
  const formattedPosts = posts
    .map((p, idx) => `--- POST ${idx + 1} (${p.postedAround || "recent"}) ---\n${p.textContent || ""}\n`)
    .join("\n");

  const prompt = `
Analyze the writing style of the following LinkedIn posts. Identify and describe:
1. The "Hook" style (e.g., questions, bold declarations, contrarian views, or storytelling).
2. Sentence length and paragraph spacing (e.g., punchy one-liners vs. detailed blocks).
3. Emoji density, placement, and bullet point formats.
4. Tone, voice, and recurring themes.
5. Hashtag usage patterns.

CORE WRITING SAMPLES:
${formattedPosts}

Based on the samples above, write a detailed writing persona profile that a writer or AI could follow to create posts that are completely indistinguishable from this author.
`;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (error) {
    console.error("Error in generatePersonaFromPosts:", error);
    throw new Error(`Failed to generate persona: ${error.message}`);
  }
};

/**
 * Rates an AI post against a persona and rewrites it to match the persona
 * @param {string} personaText 
 * @param {string} aiPost 
 * @returns {Promise<{matchingScore: number, critique: string, rewrittenPost: string}>}
 */
export const rateAndRewritePost = async (personaText, aiPost) => {
  const model = getModel();

  if (!model) {
    // Mock response if API key is not configured
    return {
      matchingScore: 75,
      critique: "The post has a good professional tone but lacks the author's signature spacing and use of console.log metaphors. (API key not configured)",
      rewrittenPost: `${aiPost}\n\n#rewritten #aligned`
    };
  }

  const prompt = `
You are a LinkedIn writing coach and style expert. You are given an author's writing persona profile and an AI-generated LinkedIn post.

Your task is to:
1. Rate how well the AI-generated post matches the author's writing style persona on a scale of 0 to 100.
2. Provide a brief critique explaining what style elements matched and what did not (e.g., tone, hook, sentence structure, emoji/hashtag density, spacing).
3. Rewrite the AI-generated post so that it perfectly matches the author's persona, while preserving the original core message, details, and call to action.

You MUST respond in JSON format with the following keys:
- "matchingScore": a number between 0 and 100
- "critique": a string containing your brief evaluation
- "rewrittenPost": a string containing the rewritten post text matching the style persona

--- AUTHOR WRITING PERSONA ---
${personaText}

--- AI-GENERATED POST ---
${aiPost}
`;

  try {
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json"
      }
    });

    const responseText = result.response.text();
    const data = JSON.parse(responseText);

    return {
      matchingScore: typeof data.matchingScore === "number" ? data.matchingScore : 70,
      critique: data.critique || "AI post lacks author hook alignment and spacing.",
      rewrittenPost: data.rewrittenPost || aiPost
    };
  } catch (error) {
    console.error("Error in rateAndRewritePost:", error);
    throw new Error(`Failed to rate and rewrite post: ${error.message}`);
  }
};
