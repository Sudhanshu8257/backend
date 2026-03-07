import { Schema, model } from "mongoose";

const sessionSchema = new Schema(
  {
    sessionId:       { type: String, required: true, unique: true },

    // Generation tracking
    generationCount: { type: Number, default: 0 },
    maxGenerations:  { type: Number, default: 3 },
    lastResetAt:     { type: Date, default: Date.now },
    generatedImages: [
      {
        url:       { type: String, required: true },
        fileId:    { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],

    // Poster/payment fields — filled progressively
    posterBase64:    { type: String, default: null }, // cleared after ImageKit upload
    posterName:      { type: String, default: null },
    posterUrl:       { type: String, default: null }, // filled after webhook
    email:           { type: String, default: null }, // filled by Stripe webhook
    stripeSessionId: { type: String, default: null },

    status: {
      type: String,
      enum: ["active", "pending_payment", "paid"],
      default: "active",
    },
  },
  { timestamps: true }
);

export default model("Session", sessionSchema);