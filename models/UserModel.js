import mongoose from "mongoose";
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    avatar: { type: String },
    email: { type: String, required: true },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    projects: [{ type: mongoose.Schema.Types.ObjectId, ref: "ProjectModel" }],
  },
  { timestamps: true }
);
const UserModel = mongoose.model("UserModel", userSchema);

export default UserModel;
