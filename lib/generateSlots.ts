import { AvailabilityRule } from "@/models/AvailabilityRule";
import { AvailabilitySlot } from "@/models/AvailabilitySlot";
import { DefaultBooking } from "@/models/DefaultBooking";

// Generates concrete AvailabilitySlot documents for a date window, based on
// all of a teacher's active rules, auto-filling any slot that matches an
// active DefaultBooking. Safe to call repeatedly — never creates duplicates
// for a (teacherId, startTime) pair that already exists.
export async function generateSlotsForWindow(teacherId: string, windowStart: Date, windowEnd: Date) {
  const rules = await AvailabilityRule.find({ teacherId, isActive: true });
  const defaults = await DefaultBooking.find({ teacherId, isActive: true });

  for (const rule of rules) {
    const rangeStart = new Date(Math.max(rule.ruleStartDate.getTime(), windowStart.getTime()));
    const rangeEnd = new Date(Math.min(rule.ruleEndDate.getTime(), windowEnd.getTime()));

    for (let day = new Date(rangeStart); day <= rangeEnd; day.setDate(day.getDate() + 1)) {
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

        // Skip if this exact slot already exists — generation is idempotent
        const existing = await AvailabilitySlot.findOne({ teacherId, startTime: slotStart });
        if (existing) continue;

        // Check if a default booking claims this exact day-of-week + time
        const timeStr = `${String(slotStart.getHours()).padStart(2, "0")}:${String(
          slotStart.getMinutes()
        ).padStart(2, "0")}`;
        const matchingDefault = defaults.find(
          (d) => d.dayOfWeek === slotStart.getDay() && d.time === timeStr
        );

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