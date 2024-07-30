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
      enum: ["Active", "In Process", "Done"],
      default: "Active",
    },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "UserModel" }],
    invitations: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "UserModel" },
        status: {
          type: String,
          enum: ["PENDING", "ACCEPTED", "REJECTED"],
          default: "PENDING",
        },
      },
    ],
  },
  { timestamps: true }
);

const ProjectModel = mongoose.model("ProjectModel", projectSchema);

export default ProjectModel;
