import { connect, disconnect } from "mongoose";
let isConnected = false;
export const connectToDatabase = async () => {
    if (isConnected) {
        return console.log("MongoDB is already connected 🤘");
    }
    try {
        await connect(process.env.MONGODB_URL, {
            dbName: "chatbot",
        });
        isConnected = true;
        console.log("hurray! MONGODB successfully connected");
    }
    catch (error) {
        console.log("MONGODB connection failed", error);
    }
};
export const disconnectDatabase = async () => {
    try {
        await disconnect();
        console.log("hurray! MONGODB successfully disconnected");
    }
    catch (error) {
        console.log("MONGODB disconnection failed", error);
    }
};
//# sourceMappingURL=connection.js.map