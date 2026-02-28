// controllers/image-controller.ts
import { Request, Response } from "express";
import { animefyImage } from "../routes/ai-helper.js";
import { PosterPrompt } from "../utils/constants.js";
import ImageKit, { toFile } from "@imagekit/nodejs";

const client = new ImageKit({
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY, 
});

export const generateAnimeController = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No image uploaded" });
    }

    const base64Input = req.file.buffer.toString("base64");
    const prompt = PosterPrompt;

    // Call Gemini
    const animeBase64 = await animefyImage(base64Input, prompt);

    // Convert base64 string to a File object for the new SDK
    const fileBuffer = Buffer.from(animeBase64, "base64");
    const file = await toFile(fileBuffer, `anime_${Date.now()}.png`, {
      type: "image/png",
    });

    // Upload to ImageKit
    const uploadResponse = await client.files.upload({
      file,
      fileName: `anime_${Date.now()}.png`,
      folder: "/anime-generated",
    });

    console.log(uploadResponse)

    return res.status(200).json({
      success: true,
      imageUrl: uploadResponse.url,
      fileId: uploadResponse.fileId,
    });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ message: error.message });
  }
};