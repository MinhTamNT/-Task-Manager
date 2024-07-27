import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    message: { type: String, required: true },
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: "UserModel" },
    project: { type: mongoose.Schema.Types.ObjectId, ref: "ProjectModel" },
    task: { type: mongoose.Schema.Types.ObjectId, ref: "TaskModel" },
  },
  { timestamps: true }
);

const NotificationModel = mongoose.model(
  "NotificationModel",
  notificationSchema
);

export default NotificationModel;
