import mongoose, { Schema, model } from "mongoose";

const conversationSchema = new Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    personality: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "Personality",
    },
  },
  {
    timestamps: true,
  }
);

export default model("Conversation", conversationSchema);
