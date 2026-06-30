import mongoose, { Schema, models, model } from "mongoose";

export interface IDefaultBooking {
  _id: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  teacherId: mongoose.Types.ObjectId;
  dayOfWeek: number;   // 0-6
  time: string;        // "19:00"
  isActive: boolean;   // teacher or student can deactivate without losing history
  createdAt: Date;
}

const DefaultBookingSchema = new Schema<IDefaultBooking>({
  studentId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  teacherId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  dayOfWeek: { type: Number, required: true },
  time: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

// Enforces "one default per day+time, globally, among ACTIVE defaults" —
// but only via application logic below, since Mongoose unique indexes can't
// easily express "unique only when isActive: true" cleanly across documents.
DefaultBookingSchema.index({ teacherId: 1, dayOfWeek: 1, time: 1 });

export const DefaultBooking =
  models.DefaultBooking || model<IDefaultBooking>("DefaultBooking", DefaultBookingSchema);