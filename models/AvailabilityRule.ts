import mongoose, { Schema, models, model } from "mongoose";

export interface IAvailabilityRule {
  _id: mongoose.Types.ObjectId;
  teacherId: mongoose.Types.ObjectId;
  daysOfWeek: number[];     // 0=Sunday, 1=Monday, ... 6=Saturday
  startTime: string;         // "14:00" — time of day the window opens
  endTime: string;           // "20:00" — time of day the window closes
  slotDurationMinutes: number; // e.g. 60 — how long each generated class slot is
  ruleStartDate: Date;       // when this rule begins applying
  ruleEndDate: Date;         // when this rule stops applying (e.g. 12 months out)
  isActive: boolean;         // teacher can deactivate the whole rule without deleting it
  createdAt: Date;
}

const AvailabilityRuleSchema = new Schema<IAvailabilityRule>({
  teacherId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  daysOfWeek: { type: [Number], required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  slotDurationMinutes: { type: Number, required: true, default: 60 },
  ruleStartDate: { type: Date, required: true },
  ruleEndDate: { type: Date, required: true },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

export const AvailabilityRule =
  models.AvailabilityRule || model<IAvailabilityRule>("AvailabilityRule", AvailabilityRuleSchema);