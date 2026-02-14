// controllers/image-controller.ts
import { Request, Response } from "express";
import { animefyImage, saveBase64Image } from "../routes/ai-helper.js";

export const generateAnimeController = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No image uploaded" });
    }

    const base64Input = req.file.buffer.toString("base64");
//     const prompt = `
// A manga portrait illustration in the distinct art style of Eiichiro Oda (One Piece). The subject is a pirate captain, based closely on the facial structure and hairstyle of the input reference image.

// The Expression & Pose: A confident, daring, or smug pirate expression. A smirk, a determined gaze, or a cocky smile. The pose is a powerful bust shot, looking towards the viewer. Maintain the user's distinctive identity while translating it into bold manga line art. Let the hair flow dynamically as if in a sea breeze.

// The Background & Atmosphere: Behind the character, include loosely sketched background elements typical of the One Piece world. Faint outlines of ship masts, rigging ropes, barrels on a deck, or distant ocean waves and clouds. These background details must be rendered with lighter ink washes and looser cross-hatching, making them appear to bleed into the paper texture, secondary to the main character.

// The Aesthetic: Bold G-pen ink outlines for the character, sharp shadows using cross-hatching, and high contrast black and white values over a textured, aged parchment paper base.

// NEGATIVE PROMPT: sweat drops, perspiration, nervous sweat, exaggerated open mouth laugh, distorted face, unrecognizable, messy foreground sketch, blurry, modern anime style, color, vibrant background, photorealistic background.`;

const prompt = `
A vibrant colored manga portrait illustration in the distinct art style of Eiichiro Oda (One Piece). The subject is a pirate captain, based closely on the facial structure and hair color of the input reference image.

The Expression & Pose: A confident, daring, or smug pirate expression (smirk, determined gaze, or cocky smile). A powerful bust shot, looking towards the viewer. Hair flows dynamically in a sea breeze.

The Color & Texture (Crucial): The character is rendered with bold anime colors and distinct cel-shading typical of One Piece color spreads. Use vibrant colors for skin, hair, and clothing, with sharp shadow shapes. However, this colored illustration must appear to be printed onto aged, textured parchment paper. The yellow/brown paper grain should subtly bleed through the colored inks, giving it a vintage, hand-painted feel rather than a clean digital look.

The Background: Loosely sketched sepia-toned ink outlines of ship masts, rigging, barrels, and ocean waves behind the character. The background should remain mostly monochromatic brown/sepia ink wash to make the vibrant colors of the character pop forward.

NEGATIVE PROMPT: monochrome, greyscale, black and white, sweat drops, exaggerated open mouth laugh, distorted face, unrecognizable, messy sketch, blurry, modern smooth digital painting, shiny 3D render.
`

    // Call Gemini
    const animeBase64 = await animefyImage(base64Input, prompt);

    // Save generated image
    const publicUrl = saveBase64Image(animeBase64);

    if (!publicUrl) {
      return res
        .status(500)
        .json({ message: "Failed to save generated image" });
    }

    return res.status(200).json({
      success: true,
      imageUrl: publicUrl,
    });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ message: error.message });
  }
};
