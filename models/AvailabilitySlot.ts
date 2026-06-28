import mongoose, { Schema, models, model } from "mongoose";

export interface IAvailabilitySlot {
  _id: mongoose.Types.ObjectId;
  teacherId: mongoose.Types.ObjectId;
  startTime: Date;
  endTime: Date;
  status: "open" | "booked";
  bookedBy?: mongoose.Types.ObjectId; // ref User._id, set when booked
  createdAt: Date;
}

const AvailabilitySlotSchema = new Schema<IAvailabilitySlot>({
  teacherId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  status: { type: String, enum: ["open", "booked"], default: "open" },
  bookedBy: { type: Schema.Types.ObjectId, ref: "User" },
  createdAt: { type: Date, default: Date.now },
});

// Speeds up the most common query: "show me this teacher's open slots in a date range"
AvailabilitySlotSchema.index({ teacherId: 1, startTime: 1 });

export const AvailabilitySlot =
  models.AvailabilitySlot || model<IAvailabilitySlot>("AvailabilitySlot", AvailabilitySlotSchema);
  