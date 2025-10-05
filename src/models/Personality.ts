import { Schema, model } from "mongoose";

const personalitySchema = new Schema(
  {
    firstName: { type: String},
    lastName: { type: String },
    fullName: { type: String, required: true, unique: true },
    type: { type: String },
    metaTitle: { type: String },
    metaKeywords: { type: String },
    metaDescription: { type: String },
    heroTitle: { type: String },
    heroDescription: { type: String },
    faq: [
      {
        question: {
          type: String,
          // required: true,
          trim: true,
        },
        answer: {
          type: String,
          // required: true,
          trim: true,
        },
      },
    ],
    systemInstruction: { type: String, required: true },
    imgUrl: { type: String },
    fee: { type: Number },
    cutFee: { type: Number },
    featured: { type: Boolean, default: false },
    features: [
      {
        title: { type: String, required: true },
        description: { type: String, required: true },
        icon: { type: String, required: true },
        colspan: { type: Number, required: true },
      },
    ],
     testimonials: [
      {
        message: { type: String, required: true },
        author: { type: String, required: true },
        role: { type: String, required: true },
        avatar: { type: String, required: true },
      }
    ],
  },
  {
    timestamps: true,
  }
);

personalitySchema.index({ firstName: "text", lastName: "text" });

export default model("Personality", personalitySchema);
