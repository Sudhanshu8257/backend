import { Schema, model } from "mongoose";

const posterSessionSchema = new Schema(
  {
    sessionId: { type: String, required: true, unique: true },
    canvasImage: { type: String, required: true }, // base64
    posterName: { type: String, required: true },
    textSize: { type: Number, required: true },
    textPosition: {
      x: { type: Number, required: true },
      y: { type: Number, required: true },
    },
    imagePosition: {
      x: { type: Number, required: true },
      y: { type: Number, required: true },
    },
    imageSize: {
      width: { type: Number, required: true },
      height: { type: Number, required: true },
    },
    email: { type: String, default: null },          // filled by Stripe webhook
    stripeSessionId: { type: String, default: null }, // filled after Stripe session created
    posterUrl: { type: String, default: null },       // filled after ImageKit upload
    status: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
    },
  },
  { timestamps: true }
);

export default model("PosterSession", posterSessionSchema);