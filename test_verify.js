import mongoose from "mongoose";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import Post from "./models/post.js";
import Persona from "./models/persona.js";
import { generatePersonaFromPosts, rateAndRewritePost } from "./services/geminiService.js";

dotenv.config();

const mockPosts = [
  {
    author: {
      name: "Bharat Pahwa",
      profilePicture: "https://media.licdn.com/dms/image/v2/D5603AQH9oWR9A2OPpQ/profile-displayphoto-scale_200_200/B56ZlWgsCeKMAY-/0/1758093036090?e=1762387200&v=beta&t=XEPFibhE8KEXlMzhzMc4biRKGN469wxLSbVOrF2RrKQ"
    },
    media: {
      type: "none",
      url: ""
    },
    memberId: "68f1b3b70b4859d9782b6e26",
    organizationId: "68f1b3830b4859d9782b6dec",
    numImpressions: 686563,
    numLikes: 5610,
    numComments: 29,
    numShares: 4,
    numViews: 686087,
    postedAround: "4 months ago",
    shareUrl: "https://www.linkedin.com/posts/bharat-pahwa_india-t20-champions-activity-7436467458389090304-JRCY",
    textContent: "JioHotstar has more consoles.logs then India's runs today.\n.\n.\n.\n.\nFewer errors than the run margins we won today.\n\nChampions TEAM INDIA. 🏆 🇮🇳 \n\n#india #t20 #champions #2026 #worldcup #nz #consolelogs",
    postUrn: "urn:li:activity:7436467458389090304"
  },
  {
    author: {
      name: "Bharat Pahwa",
      profilePicture: "https://media.licdn.com/dms/image/v2/D5603AQH9oWR9A2OPpQ/profile-displayphoto-scale_200_200/B56ZlWgsCeKMAY-/0/1758093036090?e=1762387200&v=beta&t=XEPFibhE8KEXlMzhzMc4biRKGN469wxLSbVOrF2RrKQ"
    },
    media: {
      type: "none",
      url: ""
    },
    memberId: "68f1b3b70b4859d9782b6e26",
    organizationId: "68f1b3830b4859d9782b6dec",
    numImpressions: 100000,
    numLikes: 1200,
    numComments: 45,
    numShares: 12,
    numViews: 98000,
    postedAround: "5 months ago",
    shareUrl: "https://www.linkedin.com/posts/bharat-pahwa_coding-prod-activity-7436467458389090305",
    textContent: "Why write 10 lines of code when you can write 100 and debug it for 3 days?\n\nKeep it simple. Less is always more.\n\n#coding #programming #developerlife",
    postUrn: "urn:li:activity:7436467458389090305"
  }
];

const runTest = async () => {
  try {
    console.log("🚀 Starting LinkedInPostMCP Verification Test...");

    // 1. Connect DB
    await connectDB();

    // Clean any old test records
    await Post.deleteMany({ "author.name": "Bharat Pahwa" });
    await Persona.deleteMany({ authorName: "Bharat Pahwa" });

    console.log("\n📥 Step 1: Testing Post Ingestion...");
    const operations = mockPosts.map(post => ({
      updateOne: {
        filter: { postUrn: post.postUrn },
        update: { $set: post },
        upsert: true
      }
    }));
    const ingestResult = await Post.bulkWrite(operations);
    console.log("✅ Ingested successfully:", {
      matched: ingestResult.matchedCount,
      modified: ingestResult.modifiedCount,
      upserted: ingestResult.upsertedCount
    });

    console.log("\n🔍 Step 2: Testing Post Retrieval...");
    const posts = await Post.find({
      "author.name": new RegExp("^Bharat Pahwa$", "i")
    });
    console.log(`✅ Found ${posts.length} posts for Bharat Pahwa in database.`);
    if (posts.length !== 2) {
      throw new Error(`Expected 2 posts, found ${posts.length}`);
    }

    console.log("\n🤖 Step 3: Generating Writing Persona...");
    const personaText = await generatePersonaFromPosts(posts);
    console.log("✅ Persona generated successfully!");
    console.log("-----------------------------------------");
    console.log(personaText);
    console.log("-----------------------------------------");

    // Save persona to DB
    const savedPersona = await Persona.findOneAndUpdate(
      { authorName: "Bharat Pahwa" },
      { authorName: "Bharat Pahwa", personaText },
      { upsert: true, new: true }
    );
    console.log("✅ Persona saved to database.");

    console.log("\n⚖️ Step 4: Testing AI Alignment Rating & Rewriting...");
    const aiGeneratedPost = "Here is a great update: our team worked hard and successfully launched the new tool today. There were some bugs, but we fixed them quickly. Proud of everyone.";
    console.log("AI Post to Rate:", aiGeneratedPost);
    
    const alignmentResult = await rateAndRewritePost(savedPersona.personaText, aiGeneratedPost);
    console.log("✅ Alignment analysis complete!");
    console.log("Matching Score:", alignmentResult.matchingScore);
    console.log("Critique:", alignmentResult.critique);
    console.log("Rewritten Post:\n", alignmentResult.rewrittenPost);

    console.log("\n🎉 All Verification Checks Passed Successfully!");
  } catch (error) {
    console.error("❌ Test Failed:", error);
  } finally {
    await mongoose.connection.close();
    console.log("\n🔌 DB Connection Closed.");
    process.exit(0);
  }
};

runTest();
