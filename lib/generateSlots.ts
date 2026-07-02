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

    // Collect all slots to create in this rule's window, then batch-insert
    const toCreate: any[] = [];

    for (
      let day = new Date(rangeStart);
      day <= rangeEnd;
      day.setUTCDate(day.getUTCDate() + 1)
    ) {
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

        const timeStr = `${String(slotStartHour).padStart(2, "0")}:${String(
          slotStartMinute
        ).padStart(2, "0")}`;

        const matchingDefault = defaults.find(
          (d) => d.dayOfWeek === slotStart.getUTCDay() && d.time === timeStr
        );

        toCreate.push({
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

    if (toCreate.length === 0) continue;

    // Fetch all existing slots in this window in ONE query instead of
    // one-per-slot — then filter client-side. Much faster.
    const existingSlots = await AvailabilitySlot.find({
      teacherId,
      startTime: { $gte: rangeStart, $lte: rangeEnd },
    }).select("startTime status bookedBy isDefaultBooking");

    const existingTimes = new Set(
      existingSlots.map((s) => s.startTime.getTime())
    );

    // Update any open existing slots that a default should now claim
    const toUpdate = existingSlots.filter((s) => {
      if (s.status !== "open" || s.bookedBy) return false;
      const timeStr = `${String(s.startTime.getUTCHours()).padStart(2, "0")}:${String(
        s.startTime.getUTCMinutes()
      ).padStart(2, "0")}`;
      return defaults.some(
        (d) => d.dayOfWeek === s.startTime.getUTCDay() && d.time === timeStr
      );
    });

    for (const slot of toUpdate) {
      const timeStr = `${String(slot.startTime.getUTCHours()).padStart(2, "0")}:${String(
        slot.startTime.getUTCMinutes()
      ).padStart(2, "0")}`;
      const matchingDefault = defaults.find(
        (d) => d.dayOfWeek === slot.startTime.getUTCDay() && d.time === timeStr
      );
      if (matchingDefault) {
        await AvailabilitySlot.updateOne(
          { _id: slot._id },
          { status: "booked", bookedBy: matchingDefault.studentId, isDefaultBooking: true }
        );
      }
    }

    // Only insert slots that don't already exist
    const newSlots = toCreate.filter(
      (s) => !existingTimes.has(s.startTime.getTime())
    );

    if (newSlots.length > 0) {
      // insertMany with ordered:false continues even if some fail (e.g. duplicates)
      await AvailabilitySlot.insertMany(newSlots, { ordered: false }).catch(() => {});
    }
  }
}

export async function claimExistingOpenSlotsForDefault(
  teacherId: string,
  studentId: string,
  dayOfWeek: number,
  time: string
) {
  const now = new Date();

  const futureOpenSlots = await AvailabilitySlot.find({
    teacherId,
    status: "open",
    startTime: { $gte: now },
  });

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