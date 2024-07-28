import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: {
      type: String,
    },
    authorId: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["Active", "In Proccess", "Done"],
      default: "Active",
    },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "UserModel" }],
  },
  { timestamps: true }
);
const ProjectModel = mongoose.model("ProjectModel", projectSchema);

export default ProjectModel;
