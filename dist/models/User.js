import { Schema, model } from "mongoose";
const chatSchema = new Schema({
    role: { type: String, required: true },
    parts: { type: String, required: true },
});
const userSchema = new Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    chats: [chatSchema],
}, {
    timestamps: true
});
export default model("User", userSchema);
/*

- Create conversation per celeb
- so userid and personalityId


after that create api to get conversation by its id

- in the newmessage check the query params if it has a personalityId
- search in db for that conversation with that if not create it

every personality will have its custom promt in the data itsef

use that for system instruction

*/
//# sourceMappingURL=User.js.map