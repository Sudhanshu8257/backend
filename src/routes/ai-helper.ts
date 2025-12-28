import { GoogleGenAI } from "@google/genai";
import { GoogleGenerativeAI } from "@google/generative-ai";

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
      model: "gemini-1.5-flash",
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
      googleSearch: {
      }
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
}