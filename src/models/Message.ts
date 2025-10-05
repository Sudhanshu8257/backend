import { timeStamp } from "console";
import mongoose, { model, Schema } from "mongoose";

const messageSchema = new Schema(
  {
    role: { type: String, required: true },
    parts: { type: String, required: true },
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
    },
  },
    {
    timestamps: true,
  }
);

export default model("Message", messageSchema);
