import mongoose, { Schema, models, model } from "mongoose";

export interface IProgress {
  _id: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;  // ref User._id
  courseId: mongoose.Types.ObjectId;   // ref Course._id
  currentModuleId?: mongoose.Types.ObjectId;
  currentSubmoduleId?: mongoose.Types.ObjectId;
  completedSubmoduleIds: mongoose.Types.ObjectId[];
  lastAccessedAt: Date;
}

const ProgressSchema = new Schema<IProgress>({
  studentId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  courseId: { type: Schema.Types.ObjectId, ref: "Course", required: true },
  currentModuleId: { type: Schema.Types.ObjectId, ref: "Module" },
  currentSubmoduleId: { type: Schema.Types.ObjectId, ref: "Submodule" },
  completedSubmoduleIds: [{ type: Schema.Types.ObjectId, ref: "Submodule" }],
  lastAccessedAt: { type: Date, default: Date.now },
});

ProgressSchema.index({ studentId: 1, courseId: 1 }, { unique: true });

export const Progress = models.Progress || model<IProgress>("Progress", ProgressSchema);