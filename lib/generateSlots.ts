import { AvailabilityRule } from "@/models/AvailabilityRule";
import { AvailabilitySlot } from "@/models/AvailabilitySlot";
import { DefaultBooking } from "@/models/DefaultBooking";

export async function generateSlotsForWindow(
  teacherId: string,
  windowStart: Date,
  windowEnd: Date
) {
  const rules = await AvailabilityRule.find({ teacherId, isActive: true });
  const defaults = await DefaultBooking.find({ teacherId, isActive: true });

  for (const rule of rules) {
    const rangeStart = new Date(
      Math.max(rule.ruleStartDate.getTime(), windowStart.getTime())
    );
    const rangeEnd = new Date(
      Math.min(rule.ruleEndDate.getTime(), windowEnd.getTime())
    );

    for (
      let day = new Date(rangeStart);
      day <= rangeEnd;
      day.setDate(day.getDate() + 1)
    ) {
      if (!rule.daysOfWeek.includes(day.getDay())) continue;

      const [startHour, startMin] = rule.startTime.split(":").map(Number);
      const [endHour, endMin] = rule.endTime.split(":").map(Number);
      const windowStartMinutes = startHour * 60 + startMin;
      const windowEndMinutes = endHour * 60 + endMin;

      for (
        let slotStartMin = windowStartMinutes;
        slotStartMin + rule.slotDurationMinutes <= windowEndMinutes;
        slotStartMin += rule.slotDurationMinutes
      ) {
        const slotStart = new Date(day);
        slotStart.setHours(0, 0, 0, 0);
        slotStart.setMinutes(slotStartMin);

        const slotEnd = new Date(slotStart);
        slotEnd.setMinutes(slotEnd.getMinutes() + rule.slotDurationMinutes);

        const timeStr = `${String(slotStart.getHours()).padStart(2, "0")}:${String(
          slotStart.getMinutes()
        ).padStart(2, "0")}`;

        const matchingDefault = defaults.find(
          (d) => d.dayOfWeek === slotStart.getDay() && d.time === timeStr
        );

        const existing = await AvailabilitySlot.findOne({
          teacherId,
          startTime: slotStart,
        });

        if (existing) {
          // THE KEY FIX: if a default now claims this slot but it's still "open",
          // update it in place — this handles the case where a default was set
          // AFTER the slot was already generated as open.
          if (
            matchingDefault &&
            existing.status === "open" &&
            !existing.bookedBy
          ) {
            existing.status = "booked";
            existing.bookedBy = matchingDefault.studentId;
            existing.isDefaultBooking = true;
            await existing.save();
          }
          continue;
        }

        // Slot doesn't exist yet — create it
        await AvailabilitySlot.create({
          teacherId,
          ruleId: rule._id,
          startTime: slotStart,
          endTime: slotEnd,
          status: matchingDefault ? "booked" : "open",
          bookedBy: matchingDefault ? matchingDefault.studentId : undefined,
          isDefaultBooking: !!matchingDefault,
        });
      }
    }
  }
}

// Call this immediately when a new DefaultBooking is created, to update
// any already-generated future slots that match this default's day+time.
export async function claimExistingOpenSlotsForDefault(
  teacherId: string,
  studentId: string,
  dayOfWeek: number,
  time: string
) {
  const now = new Date();

  // Find all future open slots for this teacher on this day+time
  const futureSlotsOnThisDay = await AvailabilitySlot.find({
    teacherId,
    status: "open",
    startTime: { $gte: now },
  });

  const matching = futureSlotsOnThisDay.filter((slot) => {
    const slotDay = slot.startTime.getDay();
    const slotTime = `${String(slot.startTime.getHours()).padStart(2, "0")}:${String(
      slot.startTime.getMinutes()
    ).padStart(2, "0")}`;
    return slotDay === dayOfWeek && slotTime === time;
  });

  if (matching.length === 0) return;

  await AvailabilitySlot.updateMany(
    { _id: { $in: matching.map((s) => s._id) } },
    { status: "booked", bookedBy: studentId, isDefaultBooking: true }
  );
}