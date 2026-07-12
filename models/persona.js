import mongoose from "mongoose";

const personaSchema = new mongoose.Schema(
  {
    authorName: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true
    },
    personaText: {
      type: String,
      required: true
    }
  },
  {
    timestamps: true
  }
);

// Add case-insensitive collation or index if needed, but standard query with RegExp or clean strings works.
const Persona = mongoose.model("Persona", personaSchema);
export default Persona;
