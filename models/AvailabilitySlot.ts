import mongoose, { Schema, models, model } from "mongoose";

export interface IAvailabilitySlot {
  _id: mongoose.Types.ObjectId;
  teacherId: mongoose.Types.ObjectId;
  ruleId?: mongoose.Types.ObjectId; // which AvailabilityRule generated this, if any
  startTime: Date;
  endTime: Date;
  status: "open" | "booked" | "deactivated"; // deactivated = teacher manually disabled this ONE occurrence
  bookedBy?: mongoose.Types.ObjectId;
  isDefaultBooking: boolean; // true if this slot exists because of a DefaultBooking, not a one-off pick
  createdAt: Date;
}

const AvailabilitySlotSchema = new Schema<IAvailabilitySlot>({
  teacherId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  ruleId: { type: Schema.Types.ObjectId, ref: "AvailabilityRule" },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  status: { type: String, enum: ["open", "booked", "deactivated"], default: "open" },
  bookedBy: { type: Schema.Types.ObjectId, ref: "User" },
  isDefaultBooking: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

AvailabilitySlotSchema.index({ teacherId: 1, startTime: 1 });
AvailabilitySlotSchema.index({ ruleId: 1, startTime: 1 });

export const AvailabilitySlot =
  models.AvailabilitySlot || model<IAvailabilitySlot>("AvailabilitySlot", AvailabilitySlotSchema);