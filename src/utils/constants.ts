export const COOKIE_NAME = "auth_token";
export const GEMINI_MODEL = "gemini-1.5-flash";
export function welcomeMessage() {
  const messages = [
    "Greetings, fellow human! Ready to explore the wonders of AI conversation?",
    "Welcome to the land of chatbots! Are you here to ask questions, have a conversation, or just say hi?",
    "Feeling curious today? Let's embark on a journey of discovery with the power of AI!",
    "Feeling a bit lonely? Don't worry, I'm here to chat! Ask me anything!",
  ];
  const randomIndex = Math.floor(Math.random() * messages.length);
  return messages[randomIndex];
}

export const DEFAULT_SYSYTEM_INSTRUCTION =
  "your age is 3 created by sudhanshu.You are a factual AI assistant named Converse. You can access and process information from the real world to answer user questions in a comprehensive and informative way.";


export const PosterPrompt =  `
A vibrant colored manga portrait illustration in the distinct art style of Eiichiro Oda (One Piece). The subject is a pirate captain, based closely on the facial structure and hair color of the input reference image.

The Expression & Pose: A confident, daring, or smug pirate expression (smirk, determined gaze, or cocky smile). A powerful bust shot, looking towards the viewer. Hair flows dynamically in a sea breeze.

The Color & Texture (Crucial): The character is rendered with bold anime colors and distinct cel-shading typical of One Piece color spreads. Use vibrant colors for skin, hair, and clothing, with sharp shadow shapes. The illustration appears to be printed onto light beige, textured paper (specifically matching hex color #DDCFB5). The light paper grain should subtly bleed through the colored inks, giving it a vintage, hand-painted feel rather than a clean digital look.

The Background: Loosely sketched faint brown ink outlines of ship masts, rigging, barrels, and ocean waves behind the character. The background remains bright and clear, dominated by the solid light beige paper color (#E0CFBA) to make the vibrant colors of the character pop forward.

NEGATIVE PROMPT: monochrome, greyscale, black and white, sweat drops, exaggerated open mouth laugh, distorted face, unrecognizable, messy sketch, blurry, modern smooth digital painting, shiny 3D render, dark background, dark sepia tone, heavy shadows in background, burnt edges.
`