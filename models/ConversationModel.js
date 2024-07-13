import mongoose from "mongoose";

// Schema cho Conversation
const conversationSchema = new mongoose.Schema(
  {
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "UserModel" }],
    lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: "MessageModel" },
  },
  { timestamps }
);

const ConversationModel = mongoose.model("Conversation", conversationSchema);

export default ConversationModel;
