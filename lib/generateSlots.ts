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

    // Iterate day by day through the range
    for (
      let day = new Date(rangeStart);
      day <= rangeEnd;
      day.setUTCDate(day.getUTCDate() + 1)
    ) {
      // Use UTC day-of-week so server timezone doesn't shift the day
      if (!rule.daysOfWeek.includes(day.getUTCDay())) continue;

      const [startHour, startMin] = rule.startTime.split(":").map(Number);
      const [endHour, endMin] = rule.endTime.split(":").map(Number);
      const windowStartMinutes = startHour * 60 + startMin;
      const windowEndMinutes = endHour * 60 + endMin;

      for (
        let slotStartMin = windowStartMinutes;
        slotStartMin + rule.slotDurationMinutes <= windowEndMinutes;
        slotStartMin += rule.slotDurationMinutes
      ) {
        const slotStartHour = Math.floor(slotStartMin / 60);
        const slotStartMinute = slotStartMin % 60;

        // Use Date.UTC so the stored timestamp reflects the teacher's intended
        // wall-clock time regardless of what timezone the server runs in.
        // e.g. "14:00" becomes 2026-06-29T14:00:00.000Z, not shifted by server TZ.
        const slotStart = new Date(
          Date.UTC(
            day.getUTCFullYear(),
            day.getUTCMonth(),
            day.getUTCDate(),
            slotStartHour,
            slotStartMinute,
            0,
            0
          )
        );

        const slotEnd = new Date(
          slotStart.getTime() + rule.slotDurationMinutes * 60 * 1000
        );

        // Time string in HH:MM format — matches what DefaultBooking.time stores
        const timeStr = `${String(slotStartHour).padStart(2, "0")}:${String(
          slotStartMinute
        ).padStart(2, "0")}`;

        // Check if a default booking claims this exact day-of-week + time
        const matchingDefault = defaults.find(
          (d) =>
            d.dayOfWeek === slotStart.getUTCDay() && d.time === timeStr
        );

        const existing = await AvailabilitySlot.findOne({
          teacherId,
          startTime: slotStart,
        });

        if (existing) {
          // KEY FIX: if a default now claims this slot but it's still open,
          // update it — handles the case where a default was set AFTER the
          // slot was already generated as open.
          if (matchingDefault && existing.status === "open" && !existing.bookedBy) {
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

  // Find all future open slots for this teacher
  const futureOpenSlots = await AvailabilitySlot.find({
    teacherId,
    status: "open",
    startTime: { $gte: now },
  });

  // Filter to slots matching the default's day-of-week and time using UTC
  const matching = futureOpenSlots.filter((slot) => {
    const slotDay = slot.startTime.getUTCDay();
    const slotHour = String(slot.startTime.getUTCHours()).padStart(2, "0");
    const slotMin = String(slot.startTime.getUTCMinutes()).padStart(2, "0");
    const slotTime = `${slotHour}:${slotMin}`;
    return slotDay === dayOfWeek && slotTime === time;
  });

  if (matching.length === 0) return;

  await AvailabilitySlot.updateMany(
    { _id: { $in: matching.map((s) => s._id) } },
    { status: "booked", bookedBy: studentId, isDefaultBooking: true }
  );
}
