import { NextFunction, Request, Response } from "express";
import User from "../models/User.js";
import pkg from 'bcryptjs';
import { createToken } from "../utils/token-manager.js";
import { COOKIE_NAME } from "../utils/constants.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import "dotenv/config";

const apiKey = process.env.GEMINI_API;
const genAI = new GoogleGenerativeAI(apiKey);

export const getAllUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const users = await User.find();
    return res.status(200).json({ message: "OK", users: users });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Error", cause: error.message });
  }
};

export const userSignup = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { hash } = pkg;
    const { name, email, password } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(409).json({ message: "Welcome back! Our records show you’re already part of the family." });
    const hashPassword = await hash(password, 10);
    const user = new User({ name, email, password: hashPassword });
    await user.save();

    const token = createToken(user.id.toString(), user.email, "7d");
    const expires = new Date();
    expires.setDate(expires.getDate() + 7);
    res.cookie(COOKIE_NAME, token,{
	    sameSite: 'None',
	    secure: true ,
	    expires  
    });

    return res
      .status(201)
      .json({ message: "OK", name: user.name, email: user.email,token:token });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Error", cause: error.message });
  }
};

export const userLogin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { compare } = pkg;
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).send("User not registered");
    }
    const isPasswordCorrect = await compare(password, user.password);
    if (!isPasswordCorrect) return res.status(403).json({ message: "Hmmm, that password didn’t click. Double-check and retry!" });
    res.clearCookie(COOKIE_NAME, {
	sameSite: "none",
 	secure: true,
    });

    const token = createToken(user.id.toString(), user.email, "7d");
    const expires = new Date();
    expires.setDate(expires.getDate() + 7);
    res.cookie(COOKIE_NAME, token,{
	    sameSite: 'None', 
	    secure: true , 
	    expires  
    });

    return res
      .status(200)
      .json({ message: "OK", name: user.name, email: user.email,token:token });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Error", cause: error.message });
  }
};

export const verifyUser = async (
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
    return res
      .status(200)
      .json({ message: "OK", name: user.name, email: user.email });
  } catch (error) {
    console.log(error);
    return res.status(200).json({ message: "ERROR", cause: error.message });
  }
};

export async function runy(req: Request, res: Response, next: NextFunction) {
  // For text-only input, use the gemini-pro model
  const message = req.body.message;
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });

  const chat = model.startChat();
  //"How many paws are in my house?"
  const ressss = await chat.getHistory();
  console.log(ressss);
  const msg = message;

  const result = await chat.sendMessage(msg);
  const response = await result.response;
  const text = response.text();
  console.log(text);
  return res.send(text);
}

export const userLogout = async (
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
    res.clearCookie(COOKIE_NAME, {
	sameSite: "none",
 	secure: true,
    });
    return res
      .status(200)
      .json({ message: "OK", name: user.name, email: user.email });
  } catch (error) {
    console.log(error);
    return res.status(200).json({ message: "ERROR", cause: error.message });
  }
};
