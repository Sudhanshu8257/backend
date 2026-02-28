import { NextFunction, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import Stripe from "stripe";
import { createCanvas, loadImage } from "canvas";
import { Resend } from "resend";
import ImageKit, { toFile } from "@imagekit/nodejs";
import PosterSession from "../models/PosterSession.js";
import "dotenv/config";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
console.log("STRIPE KEY",!!process.env.STRIPE_SECRET_KEY)
const resend = new Resend(process.env.RESEND_API_KEY);
const client = new ImageKit({
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
});

// -------------------------------------------------------
// HELPER: renderAndUpload
// Renders poster using saved canvas state
// Uploads to ImageKit and returns the public URL
// -------------------------------------------------------
const renderAndUpload = async (session: any): Promise<string> => {
  const POSTER_WIDTH = 800;
  const POSTER_HEIGHT = 1100;

  const canvas = createCanvas(POSTER_WIDTH, POSTER_HEIGHT);
  const ctx = canvas.getContext("2d");

  // Background
  ctx.fillStyle = "#1a1a2e";
  ctx.fillRect(0, 0, POSTER_WIDTH, POSTER_HEIGHT);

  // User image
  const img = await loadImage(session.canvasImage);
  ctx.drawImage(
    img,
    session.imagePosition.x,
    session.imagePosition.y,
    session.imageSize.width,
    session.imageSize.height,
  );

  // Poster name text
  ctx.fillStyle = "#ffffff";
  ctx.font = `bold ${session.textSize}px serif`;
  ctx.textAlign = "center";
  ctx.fillText(
    session.posterName,
    session.textPosition.x,
    session.textPosition.y,
  );

  // Convert to base64 and upload to ImageKit
  const buffer = canvas.toBuffer("image/png");
  const base64 = buffer.toString("base64");
  const uploadResponse = await client.files.upload({
    file: base64,
    fileName: `poster_${session.sessionId}.png`,

    folder: "/posters",
  });

  return uploadResponse.url;
};

// -------------------------------------------------------
// POST /api/poster/save-session
// Frontend calls this when user clicks Download
// Saves canvas state, creates Stripe Checkout session
// Returns: { checkoutUrl }
// -------------------------------------------------------
export const saveSession = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const {
      canvasImage, // base64 string
      posterName,
      textSize,
      textPosition, // { x, y }
      imagePosition, // { x, y }
      imageSize, // { width, height }
    } = req.body;

    if (!canvasImage || !posterName) {
      return res.status(400).json({ message: "Missing required canvas data" });
    }

    const sessionId = uuidv4();

    // Save canvas state to MongoDB
    await PosterSession.create({
      sessionId,
      canvasImage,
      posterName,
      textSize,
      textPosition,
      imagePosition,
      imageSize,
      status: "pending",
    });

    // Create Stripe Checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: 199, // $1.99 in cents
            product_data: {
              name: "One Piece Poster Download",
              description: `Custom poster for ${posterName}`,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        sessionId, // bridge between Stripe and our DB
      },
      // posterUrl added dynamically after webhook renders — placeholder for now
      success_url: `http://localhost:3000/success?session=${sessionId}&posterUrl=pending`,
      cancel_url: `http://localhost:3000/test2`,
    });

    // Save stripeSessionId to DB
    await PosterSession.findOneAndUpdate(
      { sessionId },
      { stripeSessionId: checkoutSession.id },
    );

    return res.status(200).json({ checkoutUrl: checkoutSession.url });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Error", cause: error.message });
  }
};

// -------------------------------------------------------
// POST /api/stripe/webhook
// Stripe calls this after successful payment
// Renders poster → uploads to ImageKit → saves URL to DB
// Emails download link via Resend
// IMPORTANT: This route needs raw body middleware (express.raw)
// -------------------------------------------------------
export const stripeWebhook = async (req: Request, res: Response) => {
  const sig = req.headers["stripe-signature"];
  console.log("process.env.STRIPE_WEBHOOK_SECRET",process.env.STRIPE_WEBHOOK_SECRET)
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body, // must be raw Buffer
      sig,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (error) {
    console.log("Webhook signature verification failed:", error.message);
    return res.status(400).send(`Webhook Error: ${error.message}`);
  }

  console.log("event.type >",event?.type)

  if (event.type === "checkout.session.completed") {
    const stripeSession = event.data.object as Stripe.Checkout.Session;
    const { sessionId } = stripeSession.metadata;
    console.log("sessionId >",sessionId)
    const email = stripeSession.customer_details?.email;
    const customerName = stripeSession.customer_details?.name || "Nakama";

    try {
      // Find the saved canvas session
      const posterSession = await PosterSession.findOne({ sessionId });
      if (!posterSession) throw new Error("PosterSession not found");

      // Render poster and upload to ImageKit
      const posterUrl = await renderAndUpload(posterSession);
        console.log(posterUrl)
      // Save email, posterUrl, mark as paid
      await PosterSession.findOneAndUpdate(
        { sessionId },
        { status: "paid", email, posterUrl },
      );

      // Email the download link via Resend
      await resend.emails.send({
        from: "One Piece Poster <noreply@yourdomain.com>",
        to: email,
        subject: "Your One Piece Poster is Ready! 🏴‍☠️",
        html: `
          <h2>Your poster is ready, ${customerName}!</h2>
          <p>Click the button below to download your custom One Piece poster:</p>
          <a href="${posterUrl}" style="
            display: inline-block;
            padding: 12px 24px;
            background: #e63946;
            color: white;
            text-decoration: none;
            border-radius: 6px;
            font-weight: bold;
          ">
            Download Your Poster
          </a>
          <p style="color: #666; font-size: 12px; margin-top: 24px;">
            This is a direct link to your poster image hosted securely.
          </p>
        `,
      });
    } catch (error) {
      console.log("Error processing webhook:", error);
      // Always return 200 to Stripe — never let it retry due to our errors
    }
  }

  return res.status(200).json({ received: true });
};

// -------------------------------------------------------
// GET /api/poster/session/:sessionId
// Frontend polls this on the success page
// Returns posterUrl once webhook has finished processing
// -------------------------------------------------------
export const getSession = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { sessionId } = req.params;

    const session = await PosterSession.findOne(
      { sessionId },
      { status: 1, posterUrl: 1, posterName: 1 }, // only return what frontend needs
    );

    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    return res.status(200).json({
      status: session.status,
      posterUrl: session.posterUrl,
      posterName: session.posterName,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Error", cause: error.message });
  }
};
