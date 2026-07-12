import express from "express";
import { ingestPosts, getPostsByAuthor } from "../controllers/postController.js";

const router = express.Router();

router.post("/ingest", ingestPosts);
router.get("/", getPostsByAuthor);

export default router;
