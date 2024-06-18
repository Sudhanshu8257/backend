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
};
