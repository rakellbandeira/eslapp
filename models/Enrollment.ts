import mongoose, { Schema, models, model } from "mongoose";

export interface IEnrollment {
  _id: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;   // ref User._id
  courseId: mongoose.Types.ObjectId;    // ref Course._id
  assignedBy: mongoose.Types.ObjectId;  // ref User._id (the teacher who assigned it)
  status: "active" | "revoked";
  assignedAt: Date;
}

const EnrollmentSchema = new Schema<IEnrollment>({
  studentId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  courseId: { type: Schema.Types.ObjectId, ref: "Course", required: true },
  assignedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  status: { type: String, enum: ["active", "revoked"], default: "active" },
  assignedAt: { type: Date, default: Date.now },
});

EnrollmentSchema.index({ studentId: 1, courseId: 1 }, { unique: true });

export const Enrollment = models.Enrollment || model<IEnrollment>("Enrollment", EnrollmentSchema);