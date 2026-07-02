import mongoose, { Schema, models, model } from "mongoose";

export interface IStudentMeetingLink {
  _id: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  teacherId: mongoose.Types.ObjectId;
  url: string;
  updatedAt: Date;
}

const StudentMeetingLinkSchema = new Schema<IStudentMeetingLink>({
  studentId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  teacherId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  url: { type: String, required: true },
  updatedAt: { type: Date, default: Date.now },
});

StudentMeetingLinkSchema.index({ studentId: 1, teacherId: 1 }, { unique: true });

export const StudentMeetingLink =
  models.StudentMeetingLink ||
  model<IStudentMeetingLink>("StudentMeetingLink", StudentMeetingLinkSchema);