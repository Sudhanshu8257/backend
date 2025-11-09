import { GoogleGenerativeAI } from "@google/generative-ai";
import "dotenv/config";
import { NextFunction, Request, Response } from "express";
import User from "../models/User.js";
import {
  DEFAULT_SYSYTEM_INSTRUCTION,
  GEMINI_MODEL,
} from "../utils/constants.js";
import mongoose from "mongoose";
import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import { getGeminiResponseV2, transformMessages } from "../routes/ai-helper.js";
import Personality from "../models/Personality.js";
const apiKey = process.env.GEMINI_API;
const genAI = new GoogleGenerativeAI(apiKey);

export async function getChat(req: Request, res: Response, next: NextFunction) {
  const { message } = req.body;
  try {
    const user = await User.findById(res.locals.jwtData.id);
    if (!user) return res.status(401).json({ message: "Try logging in again" });

    const chats = user?.chats?.map(({ role, parts }) => ({ role, parts }));

    const last20Messages = chats.slice(-20);
    user.chats.push({ parts: message, role: "user" });

    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      //@ts-ignore
      systemInstruction:
        "your age is 3 created by sudhanshu.You are a factual AI assistant named Converse. You can access and process information from the real world to answer user questions in a comprehensive and informative way.",
    });

    const chat = model.startChat({
      history: last20Messages,
    });

    const result = await chat.sendMessage(message);
    const response = await result.response;

    const text = response.text();
    const geminiResponse = { role: "model", parts: text };
    user.chats.push(geminiResponse);
    await user.save();
    return res.status(200).json({ chats: geminiResponse });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Error", cause: error.message });
  }
}

export const sendChatsToUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    //user token check
    const user = await User.findById(res.locals.jwtData.id);
    if (!user) {
      return res.status(401).send("User not registered OR Token malfunctioned");
    }
    if (user._id.toString() !== res.locals.jwtData.id) {
      return res.status(401).send("Permissions didn't match");
    }
    return res.status(200).json({ message: "OK", chats: user.chats });
  } catch (error) {
    console.log(error);
    return res.status(200).json({ message: "ERROR", cause: error.message });
  }
};

export const deleteChats = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const personalityId = req.query.personalityId as string;

    if (personalityId && !mongoose.Types.ObjectId.isValid(personalityId)) {
      return res.status(400).json({
        success: false,
        message: "Provide a valid personality id",
      });
    }

    const user = await User.findById(res.locals.jwtData.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not registered OR Token malfunctioned",
      });
    }
    if (personalityId) {
      const personality = await Personality.findById(personalityId);
      if (!personality) {
        return res.status(404).json({
          success: false,
          message: "Personality not found",
        });
      }

      const conversation = await Conversation.findOne({
        personality: personalityId,
        user: user._id,
      });
      if (!conversation) {
        return res.status(404).json({
          success: false,
          message: "No messages found",
        });
      }
      await Message.deleteMany({ conversation: conversation._id });
    } else {
      //@ts-ignore
      user.chats = [];
      await user.save();
    }
    return res.status(200).json({ success: true, message: "OK" });
  } catch (error) {
    console.log(error.message);
    return res
      .status(500)
      .json({ success: false, message: "ERROR", cause: error.message });
  }
};

export async function getChatV2(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const { message, personalityId } = req.body;
  try {
    if (!message)
      return res.status(400).json({ message: "message is required" });

    if (personalityId && !mongoose.Types.ObjectId.isValid(personalityId)) {
      return res.status(400).json({ message: "Invalid personalityId" });
    }

    const user = await User.findById(res.locals.jwtData.id);
    if (!user) return res.status(401).json({ message: "Try logging in again" });

    let conversation: any;

    if (personalityId) {
      const personality = await Personality.findById(personalityId).select(
        "systemInstruction"
      );
      if (!personality)
        return res.status(404).json({ message: "Personality not found" });

      conversation = await Conversation.findOneAndUpdate(
        { user: user._id, personality: personalityId },
        { $setOnInsert: { user: user._id, personality: personalityId } },
        { new: true, upsert: true }
      );
      const last20Messages = await Message.find({
        conversation: conversation._id,
      })
        .sort({ createdAt: 1 })
        .limit(20)
        .select("role parts");

      const geminiResponse = await getGeminiResponseV2({
        lastMessages: transformMessages(last20Messages),
        newmessage: message,
        systemInstruction: personality.systemInstruction,
      });

      if (geminiResponse?.error) {
        return res
          .status(500)
          .json({ message: "Servers are busy. Try Again Later" });
      }

      await Message.create({
        conversation: conversation._id,
        role: "user",
        parts: message,
      });

      await Message.create({
        conversation: conversation._id,
        ...geminiResponse,
      });

      return res.status(200).json({ chats: geminiResponse });
    }

    const chats = user?.chats?.map(({ role, parts }) => ({ role, parts }));

    const last20Messages = chats.slice(-20);
    user.chats.push({ parts: message, role: "user" });

    const geminiResponse = await getGeminiResponseV2({
      lastMessages: transformMessages(last20Messages),
      newmessage: message,
      systemInstruction: DEFAULT_SYSYTEM_INSTRUCTION,
    });

    user.chats.push(geminiResponse);
    await user.save();
    return res.status(200).json({ chats: geminiResponse });
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({ message: "Error", cause: error.message });
  }
}

export async function getPersonalityMessagesById(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const { personalityId } = req.query;
  let { page, perPage } = req.query;

  const pageNumber = page ? parseInt(page as string, 10) : 1;
  const limit = perPage ? parseInt(perPage as string, 10) : 20;
  const skip = (pageNumber - 1) * limit;

  try {
    if (
      !personalityId ||
      !mongoose.Types.ObjectId.isValid(personalityId as string)
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Valid personalityId is required" });
    }

    const [personality, user] = await Promise.all([
      Personality.findById(personalityId).select("-systemInstruction -__v"),
      User.findById(res.locals.jwtData.id),
    ]);

    if (!personality) {
      return res
        .status(404)
        .json({ success: false, message: "Personality not found" });
    }
    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "Try logging in again" });
    }

    const conversation = await Conversation.findOne({
      personality: personalityId,
      user: user._id,
    });
    if (!conversation) {
      return res.status(200).json({
        success: true,
        data: {
          conversation,
          messages: [],
          pagination: {
            page: pageNumber,
            perPage: limit,
            totalPages: 1,
            totalMessages: 0,
          },
        },
      });
    }

    // Aggregation with sorting + pagination
    const messagesAggregation = await Message.aggregate([
      { $match: { conversation: conversation._id } },
      { $sort: { createdAt: 1 } }, // newest first
      { $skip: skip },
      { $limit: limit },
      {
        $project: {
          conversation: 0,
          updatedAt: 0,
          __v: 0,
        },
      },
    ]);

    const totalMessages = await Message.countDocuments({
      conversation: conversation._id,
    });
    const totalPages = Math.ceil(totalMessages / limit);

    return res.status(200).json({
      success: true,
      data: {
        conversation,
        messages: messagesAggregation,
        pagination: {
          page: pageNumber,
          perPage: limit,
          totalPages,
          totalMessages,
        },
      },
    });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      cause: error.message || error,
    });
  }
}

export async function getPersonalityById(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const id = req.query.id as string;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "A valid id is required",
      });
    }

    const personality = await Personality.findById(id).select(
      "-systemInstruction"
    );

    if (!personality) {
      return res.status(404).json({
        success: false,
        message: "Personality not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Personality fetched successfully",
      data: personality,
    });
  } catch (error: any) {
    console.error(error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      cause: error.message || error,
    });
  }
}

export async function getAllPersonalities(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { search, featured, id, page = 1, perPage = 100 } = req.query;

    const pageNumber = Math.max(1, parseInt(page as string, 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(perPage as string, 10) || 100)
    );
    const skip = (pageNumber - 1) * limit;

    const pipeline: any[] = [];

    if (id) {
      if (!mongoose.Types.ObjectId.isValid(id as string)) {
        return res.status(400).json({
          success: false,
          message: "Invalid ID format",
        });
      }

      const personality = await Personality.findById(id)
        .select("-systemInstruction -fee -cutFee -updatedAt -__v")
        .lean();

      if (!personality) {
        return res.status(404).json({
          success: false,
          message: "Personality not found",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Personality fetched successfully",
        pagination: {
          page: 1,
          perPage: 1,
          totalPages: 1,
          totalPersonalities: 1,
        },
        data: [personality],
      });
    }

    const matchStage: any = {};

    if (featured === "true") {
      matchStage.featured = true;
    }

    if (Object.keys(matchStage).length > 0) {
      pipeline.push({ $match: matchStage });
    }

    if (search) {
      pipeline.push({
        $search: {
          index: "fullName_search",
          text: {
            query: String(search),
            path: "fullName",
            fuzzy: { maxEdits: 1, prefixLength: 1 },
          },
        },
      });
      // Optional: sort by Atlas Search score
      pipeline.push({
        $addFields: { _searchScore: { $meta: "searchScore" } },
      });
      pipeline.push({ $sort: { _searchScore: -1 } });
    }

    pipeline.push({
      $facet: {
        metadata: [{ $count: "total" }],
        data: [
          { $skip: skip },
          { $limit: limit },
          {
            $project: {
              systemInstruction: 0,
              fee: 0,
              cutFee: 0,
              updatedAt: 0,
              __v: 0,
            },
          },
        ],
      },
    });

    const result = await Personality.aggregate(pipeline);

    const totalPersonalities = result[0]?.metadata[0]?.total || 0;
    const totalPages = Math.ceil(totalPersonalities / limit);

    return res.status(200).json({
      success: true,
      message: "Personalities fetched successfully",
      pagination: {
        page: pageNumber,
        perPage: limit,
        totalPages,
        totalPersonalities,
      },
      data: result[0]?.data || [],
    });
  } catch (error: any) {
    console.error("Error fetching personalities:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      cause: error.message || error,
    });
  }
}

export async function getPersonalityByName(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { name } = req.query;

    if (!name || typeof name !== "string" || name.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Name query parameter is required",
      });
    }

    const searchQuery = name.toLowerCase().trim();

    let personality = await Personality.findOne({
      fullName: { $regex: new RegExp(`^${searchQuery}$`, "i") },
    })
      .select("-systemInstruction -fee -cutFee -updatedAt -__v")
      .lean();

    if (!personality) {
      const result = await Personality.aggregate([
        {
          $search: {
            index: "fullName",
            text: {
              query: searchQuery,
              path: "fullName",
              fuzzy: { maxEdits: 1 },
            },
          },
        },
        { $limit: 1 },
        {
          $project: {
            systemInstruction: 0,
            fee: 0,
            cutFee: 0,
            updatedAt: 0,
            __v: 0,
          },
        },
      ]);

      personality = result[0] || null;
    }

    if (!personality) {
      return res.status(404).json({
        success: false,
        message: "Personality not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: personality,
    });
  } catch (error: any) {
    console.error("Error fetching personality by name:", error);
    next(error);
  }
}
