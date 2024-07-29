import mongoose from "mongoose";

const taskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: String,
    dueDate: Date,
    status: {
      type: String,
      enum: ["todo", "in_progress", "done"],
      default: "todo",
    },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProjectModel",
      required: true,
    },
    subTasks: [{ type: mongoose.Schema.Types.ObjectId, ref: "Task" }], // Reference to other tasks
  },
  { timestamps: true }
);

const Task = mongoose.model("Task", taskSchema);
export default Task;
