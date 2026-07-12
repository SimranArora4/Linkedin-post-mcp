import Post from "../models/post.js";

// POST /api/posts/ingest
export const ingestPosts = async (req, res) => {
  try {
    let posts = req.body.posts;
    console.log(req.body);
    if (req.body && req.body.posts && Array.isArray(req.body.posts)) {
      posts = req.body.posts;
    }
    if (!posts || !Array.isArray(posts) || posts.length === 0) {
      return res.status(400).json({
        status: "error",
        message: "Invalid payload. Expected an array of posts or an object containing a posts array."
      });
    }

    // Validate structure of posts and create upsert bulkWrite operations
    const operations = [];
    for (const post of posts) {
      if (!post.postUrn || !post.textContent) {
        continue; 
      }

      // Exclude _id and __v to prevent MongoDB immutable field update error
      const postData = { ...post };
      delete postData._id;
      delete postData.__v;

      operations.push({
        updateOne: {
          filter: { postUrn: post.postUrn },
          update: { $set: postData },
          upsert: true
        }
      });
    }

    if (operations.length === 0) {
      return res.status(400).json({
        status: "error",
        message: "No valid posts found to ingest (missing postUrn or textContent)."
      });
    }

    const result = await Post.bulkWrite(operations);

    res.status(200).json({
      status: "success",
      message: "Posts ingested successfully",
      details: {
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
        upsertedCount: result.upsertedCount,
        totalIngested: operations.length
      }
    });
  } catch (error) {
    console.error("❌ Ingestion Error:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error during ingestion",
      error: error.message
    });
  }
};

// GET /api/posts
export const getPostsByAuthor = async (req, res) => {
  try {
    const { authorName } = req.query;

    if (!authorName) {
      return res.status(400).json({
        status: "error",
        message: "Missing required query parameter: authorName"
      });
    }

    // Case-insensitive exact match
    const posts = await Post.find({
      "author.name": new RegExp(`^${authorName.trim()}$`, "i")
    }).sort({ createdAt: -1 });

    res.status(200).json({
      status: "success",
      results: posts.length,
      data: posts
    });
  } catch (error) {
    console.error("❌ Fetch Posts Error:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error fetching posts",
      error: error.message
    });
  }
};
