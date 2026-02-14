import multer from "multer";
import { Request } from "express";

// Store file in memory (RAM)
const storage = multer.memoryStorage();

// Allow images only
const fileFilter: multer.Options["fileFilter"] = (
  _req: Request,
  file,
  cb
) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed"));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB (important!)
  },
});
