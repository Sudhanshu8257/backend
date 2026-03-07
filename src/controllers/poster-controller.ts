import { NextFunction, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import Stripe from "stripe";
import { Resend } from "resend";
import ImageKit, { toFile } from "@imagekit/nodejs";
import Session from "../models/Session.js";
import { PosterPrompt } from "../utils/constants.js";
import { animefyImage } from "../routes/ai-helper.js";
import "dotenv/config";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const resend = new Resend(process.env.RESEND_API_KEY);
const client = new ImageKit({
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
});

const RESET_HOURS = 24;

const formatSession = (session: any) => ({
  sessionId: session.sessionId,
  generationCount: session.generationCount,
  maxGenerations: session.maxGenerations,
  attemptsLeft: Math.max(0, session.maxGenerations - session.generationCount),
  generatedImages: session.generatedImages,
  status: session.status,
  lastResetAt: session.lastResetAt,
  resetInMs: Math.max(
    0,
    new Date(session.lastResetAt).getTime() +
      RESET_HOURS * 60 * 60 * 1000 -
      Date.now(),
  ),
});

// -------------------------------------------------------
// HELPER: createNewSession
// -------------------------------------------------------
const createNewSession = async () => {
  const sessionId = uuidv4();
  const session = await Session.create({ sessionId });
  return formatSession(session);
};

export const startSession = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { sessionId } = req.body;

    if (sessionId) {
      const existing = await Session.findOne({ sessionId });

      if (existing) {
        // Paid — give them a fresh session for a new poster
        if (existing.status === "paid") {
          return res.status(200).json(await createNewSession());
        }

        // Check 24hr reset
        const hoursSinceReset =
          (Date.now() - new Date(existing.lastResetAt).getTime()) /
          (1000 * 60 * 60);

        if (hoursSinceReset >= RESET_HOURS) {
          const reset = await Session.findOneAndUpdate(
            { sessionId },
            {
              generationCount: 0,
              lastResetAt: new Date(),
              generatedImages: [],
              posterBase64: null,
              posterName: null,
              posterUrl: null,
              stripeSessionId: null,
              status: "active",
            },
            { new: true },
          );
          return res.status(200).json(formatSession(reset));
        }

        // Valid active session — return as-is
        return res.status(200).json(formatSession(existing));
      }
    }

    // No sessionId or not found — create fresh
    return res.status(200).json(await createNewSession());
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Error", cause: error.message });
  }
};

export const getSessionState = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { sessionId } = req.params;
    const session = await Session.findOne({ sessionId });

    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    return res.status(200).json(formatSession(session));
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Error", cause: error.message });
  }
};

export const generateAnimeImage = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No image uploaded" });
    }

    const { sessionId } = req.body;
    if (!sessionId) {
      return res.status(400).json({ message: "Missing sessionId" });
    }

    const session = await Session.findOne({ sessionId });
    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    if (session.status === "paid") {
      return res.status(403).json({
        message:
          "Session complete. Start a new session to create another poster.",
      });
    }

    // Check 24hr reset before enforcing limit
    const hoursSinceReset =
      (Date.now() - new Date(session.lastResetAt).getTime()) / (1000 * 60 * 60);

    if (hoursSinceReset >= RESET_HOURS) {
      await Session.findOneAndUpdate(
        { sessionId },
        { generationCount: 0, lastResetAt: new Date(), generatedImages: [] },
      );
      session.generationCount = 0;
    }

    // Enforce generation limit
    if (session.generationCount >= session.maxGenerations) {
      const resetInMs = Math.max(
        0,
        new Date(session.lastResetAt).getTime() +
          RESET_HOURS * 60 * 60 * 1000 -
          Date.now(),
      );
      return res.status(429).json({
        message: "Generation limit reached",
        attemptsLeft: 0,
        resetInMs,
      });
    }
    // Generate anime image via Gemini
    const base64Input = req.file.buffer.toString("base64");
    const animeBase64 = await animefyImage(base64Input, PosterPrompt);

    // Upload to ImageKit
    const fileBuffer = Buffer.from(animeBase64, "base64");
    const file = await toFile(fileBuffer, `anime_${Date.now()}.png`, {
      type: "image/png",
    });

    const uploadResponse = await client.files.upload({
      file,
      fileName: `anime_${Date.now()}.png`,
      folder: "/anime-generated",
    });

    // Increment count + push to history
    const updated = await Session.findOneAndUpdate(
      { sessionId },
      {
        $inc: { generationCount: 1 },
        $push: {
          generatedImages: {
            url: uploadResponse.url,
            fileId: uploadResponse.fileId,
          },
        },
      },
      { new: true },
    );

    return res.status(200).json({
      success: true,
      imageUrl: uploadResponse.url,
      fileId: uploadResponse.fileId,
      attemptsLeft: Math.max(
        0,
        updated.maxGenerations - updated.generationCount,
      ),
      generatedImages: updated.generatedImages,
    });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ message: error.message });
  }
};

export const saveSession = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { sessionId, posterBase64, posterName } = req.body;

    if (!sessionId || !posterBase64 || !posterName) {
      return res.status(400).json({
        message: "Missing sessionId, posterBase64 or posterName",
      });
    }

    const session = await Session.findOne({ sessionId });
    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    if (session.status === "paid") {
      return res.status(403).json({
        message: "Session already paid. Start a new session.",
      });
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: 199, // $1.99
            product_data: {
              name: "One Piece Poster Download",
              description: `Custom poster for ${posterName}`,
            },
          },
          quantity: 1,
        },
      ],
      metadata: { sessionId },
      // success_url: `${process.env.FRONTEND_URL}/poster/success/${sessionId}`,
      // cancel_url: `${process.env.FRONTEND_URL}/poster/${sessionId}`,
      success_url: `http://localhost:3000/poster/success/${sessionId}`,
      cancel_url: `http://localhost:3000/poster/${sessionId}`,
    });

    // Save everything to session document
    await Session.findOneAndUpdate(
      { sessionId },
      {
        posterBase64,
        posterName,
        stripeSessionId: checkoutSession.id,
        status: "pending_payment",
      },
    );

    return res.status(200).json({ checkoutUrl: checkoutSession.url });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Error", cause: error.message });
  }
};

export const stripeWebhook = async (req: Request, res: Response) => {
  const sig = req.headers["stripe-signature"];
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (error) {
    console.log("Webhook signature failed:", error.message);
    return res.status(400).send(`Webhook Error: ${error.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const stripeSession = event.data.object as Stripe.Checkout.Session;
    const { sessionId } = stripeSession.metadata;
    const email = stripeSession.customer_details?.email;
    const customerName = stripeSession.customer_details?.name || "Nakama";

    try {
      const session = await Session.findOne({ sessionId });
      if (!session) throw new Error("Session not found");
      if (!session.posterBase64) throw new Error("No poster data in session");

      // Upload base64 to ImageKit
      const uploadResponse = await client.files.upload({
        file: session.posterBase64,
        fileName: `poster_${sessionId}.png`,
        folder: "/posters",
      });

      const posterUrl = uploadResponse.url;

      // Mark paid, save email + URL, clear base64
      await Session.findOneAndUpdate(
        { sessionId },
        { status: "paid", email, posterUrl, posterBase64: null },
      );

      // Email download link
      await resend.emails.send({
        from: "One Piece Poster <onboarding@resend.dev>",
        to: email,
        subject: "Your One Piece Poster is Ready! 🏴‍☠️",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
            <h2 style="color: #1a1a2e;">Your poster is ready, ${customerName}!</h2>
            <p style="color: #444;">Click below to download your custom One Piece poster:</p>
            <a href="${posterUrl}"
               target="_blank"
               style="
                display: inline-block;
                padding: 12px 28px;
                background: #e63946;
                color: white;
                text-decoration: none;
                border-radius: 6px;
                font-weight: bold;
                margin: 16px 0;
              ">
              Download Your Poster
            </a>
            <p style="color: #999; font-size: 12px; margin-top: 24px;">
              If the button doesn't work, copy this link:<br/>${posterUrl}
            </p>
          </div>
        `,
      });
    } catch (error) {
      console.log("Webhook processing error:", error);
      // Always return 200 — never let Stripe retry our errors
    }
  }

  return res.status(200).json({ received: true });
};

export const getSession = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { sessionId } = req.params;

    const session = await Session.findOne(
      { sessionId },
      { status: 1, posterUrl: 1, posterName: 1 },
    );

    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    return res.status(200).json({
      status: session.status,
      posterUrl: session.posterUrl ?? null,
      posterName: session.posterName,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Error", cause: error.message });
  }
};
