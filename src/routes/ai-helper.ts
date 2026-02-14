import { GoogleGenAI } from "@google/genai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

const apiKey = process.env.GEMINI_API;

const genAI = new GoogleGenerativeAI(apiKey);
const ai = new GoogleGenAI({ apiKey });

type OldMessage = { role: string; parts: string };
type NewMessage = { role: string; parts: { text: string }[] };

export const getGeminiResponse = async ({
  lastMessages,
  newmessage,
  systemInstruction,
}: {
  lastMessages: { role: string; parts: string }[];
  newmessage: string;
  systemInstruction: string;
}) => {
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-3-flash-preview",
      // @ts-expect-error SystemInstruction
      systemInstruction,
    });

    const chat = model.startChat({
      history: lastMessages,
    });

    const result = await chat.sendMessage(newmessage);
    const response = await result.response;
    const text = response.text();
    return { role: "model", parts: text };
  } catch (e) {
    console.error("An error occured in geminiResponse", e.message);
    return { error: true, message: e.message };
  }
};

export const getGeminiResponseV2 = async ({
  lastMessages,
  newmessage,
  systemInstruction,
}: {
  lastMessages: { role: string; parts: { text: string }[] }[];
  newmessage: string;
  systemInstruction: string;
}) => {
  try {
    const tools = [
      {
        googleSearch: {},
      },
    ];

    const chat = ai.chats.create({
      model: "gemini-3-flash-preview",
      history: lastMessages,
      config: {
        tools,
        systemInstruction,
      },
    });

    const response = await chat.sendMessage({
      message: newmessage,
    });
    return { role: "model", parts: response.text };
  } catch (e) {
    console.error("An error occured in geminiResponseV2", e.message);
    return { error: true, message: e.message };
  }
};

export const transformMessages = (messages: OldMessage[]): NewMessage[] => {
  return messages.map((message) => ({
    role: message.role,
    parts: [{ text: message.parts }],
  }));
};

export const getGeminiVisionResponse = async ({
  prompt,
  image,
  systemInstruction,
}: {
  prompt: string;
  image: string; // Base64 string from frontend
  systemInstruction?: string;
}) => {
  try {
    // 1. Use a vision-capable model (Gemini 1.5 Flash is fast and cheap for images)
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      config: {
        tools,
        systemInstruction,
      },
    });

    // 2. Clean the Base64 string
    // Frontend often sends "data:image/jpeg;base64,..." prefix. We need to remove it.
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");

    // 3. Detect MimeType (Simple regex) or default to jpeg
    const mimeType =
      image.match(/[^:]\w+\/[\w-+\d.]+(?=;|,)/)?.[0] || "image/jpeg";

    // 4. Create the Image Part object required by Google API
    const imagePart = {
      inlineData: {
        data: base64Data,
        mimeType: mimeType,
      },
    };

    // 5. Send Request (Prompt + Image)
    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;

    return { role: "model", parts: response.text() };
  } catch (e: any) {
    console.error("Gemini Vision Error:", e.message);
    return { error: true, message: "Failed to process image: " + e.message };
  }
};

export const saveBase64Image = (base64Data: string) => {
  try {
    // 1. Remove the "data:image/png;base64," prefix
    const base64Image = base64Data.split(";base64,").pop();

    if (!base64Image) throw new Error("Invalid Base64 Data");

    // 2. Generate unique filename
    const filename = `anime-${uuidv4()}.png`;
    const filePath = path.join(process.cwd(), "user/poster", filename);

    // 3. Convert to Buffer and Write to Disk
    fs.writeFileSync(filePath, base64Image, { encoding: "base64" });

    // 4. Return the public URL
    return `/user/poster/${filename}`;
  } catch (error) {
    console.error("File Save Error:", error);
    return null;
  }
};

export async function animefyImage(
  base64Image: string,
  stylePrompt = "classic anime style",
): Promise<string> {
  try {
    const prompt = `Edit this image to transform it into a ${stylePrompt}. Keep the composition and character features similar, but change the art style to high-quality anime.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: [
        { text: prompt },
        {
          inlineData: {
            data: base64Image,
            mimeType: "image/png",
          },
        },
      ],
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData?.data) {
        // ✅ RETURN base64 (not buffer, not file)
        return part.inlineData.data;
      }
    }

    throw new Error("No image returned from Gemini");
  } catch (error: any) {
    console.error("Animefy Error:", error);
    throw new Error(error.message);
  }
}

