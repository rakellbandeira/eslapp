import mongoose, { Schema, models, model } from "mongoose";

export interface ICourse {
  _id: mongoose.Types.ObjectId;
  title: string;
  description: string;
  teacherId: mongoose.Types.ObjectId; // ref User._id
  isPublished: boolean;
  createdAt: Date;
}

const CourseSchema = new Schema<ICourse>({
  title: { type: String, required: true },
  description: { type: String, default: "" },
  teacherId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  isPublished: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

export const Course = models.Course || model<ICourse>("Course", CourseSchema);