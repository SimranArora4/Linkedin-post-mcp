import mongoose from "mongoose";

const postSchema = new mongoose.Schema(
  {
    author: {
      name: { type: String, required: true, index: true },
      profilePicture: { type: String, default: "" }
    },
    media: {
      type: { type: String, default: "none" },
      url: { type: String, default: "" }
    },
    memberId: { type: String },
    organizationId: { type: String },
    numImpressions: { type: Number, default: 0 },
    numLikes: { type: Number, default: 0 },
    numComments: { type: Number, default: 0 },
    numShares: { type: Number, default: 0 },
    numViews: { type: Number, default: 0 },
    postedAround: { type: String },
    shareUrl: { type: String },
    textContent: { type: String, required: true },
    postUrn: { type: String, required: true, unique: true, index: true }
  },
  {
    timestamps: true
  }
);

const Post = mongoose.model("Post", postSchema);
export default Post;
