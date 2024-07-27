import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    content: { type: String, required: true },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ConversationModel",
      required: true,
    },
  },
  { timestamps: true }
);

const MessageModel = mongoose.model("MessageModel", messageSchema);

export default MessageModel;
