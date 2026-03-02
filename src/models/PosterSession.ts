import { Schema, model } from "mongoose";

const posterSessionSchema = new Schema(
  {
    sessionId: { type: String, required: true, unique: true },
    posterBase64: { type: String, default: null }, // cleared after ImageKit upload
    posterName: { type: String, required: true },
    posterUrl: { type: String, default: null }, // filled after webhook uploads
    email: { type: String, default: null }, // filled by Stripe webhook
    stripeSessionId: { type: String, default: null },
    status: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
    },
  },
  { timestamps: true },
);

export default model("PosterSession", posterSessionSchema);
