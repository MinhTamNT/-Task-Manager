import mongoose from "mongoose";
const userSchema = new mongoose.Schema(
  {
    uuid: { type: String, required: true },
    name: { type: String, required: true },
    image: { type: String },
    email: { type: String, required: true },
    role: { type: String, enum: ["user", "admin"], default: "user" },
  },
  { timestamps: true }
);
const UserModel = mongoose.model("UserModel", userSchema);

export default UserModel;
