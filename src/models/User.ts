import { Schema, model } from "mongoose";

const chatSchema = new Schema({
  role: { type: String, required: true },
  parts: { type: String, required: true },
});

const userSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  chats: [chatSchema],
});

export default model("User", userSchema);
