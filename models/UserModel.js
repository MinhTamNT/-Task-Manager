import mongoose from "mongoose";
import cloudinary from "cloudinary";
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    avatar: { type: String },
    email: { type: String, required: true },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    projects: [{ type: mongoose.Schema.Types.ObjectId, ref: "ProjectModel" }],
  },
  { timestamps }
);
const UserModel = mongoose.Schema("UserModel", userSchema);
userSchema.pre("save", async function (next) {
  if (this.avatar && this.isModified("avatar")) {
    try {
      const avatar = await cloudinary.v2.uploader.upload(this.avatar);
      this.avatar = avatar.secure_url;
    } catch (error) {
      console.log(error);
    }
  }
  next();
});
export default UserModel;
