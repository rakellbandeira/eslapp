import mongoose, { Schema, models, model } from "mongoose";

export interface IModule {
  _id: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId; // ref Course._id
  title: string;
  order: number; // controls display order within the course
  createdAt: Date;
}

const ModuleSchema = new Schema<IModule>({
  courseId: { type: Schema.Types.ObjectId, ref: "Course", required: true },
  title: { type: String, required: true },
  order: { type: Number, required: true, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

export const Module = models.Module || model<IModule>("Module", ModuleSchema);