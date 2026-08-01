// manualEdit.js
// FUTURE FEATURE SCAFFOLD - not yet wired into the UI (the schedule table
// is currently read-only). These two functions are what a "drag this match
// to a new venue/time" editor would call: check a candidate slot is
// actually free, then commit the move by updating the shared `sessions`
// free-interval state (the same structure core/venueAllocator.js builds and
// mutates) and the `scheduled` map the report builder reads from.

function overlaps(a, b) {
  return a.startAbs < b.endAbs && b.startAbs < a.endAbs;
}

/** Every OTHER match currently booked into `sessions`, as {venueName, day, startAbs, endAbs}. */
function otherBookings(scheduled, excludeMatchId) {
  const list = [];
  for (const [matchId, slot] of scheduled) {
    if (matchId === excludeMatchId) continue;
    list.push({ matchId, ...slot });
  }
  return list;
}

/**
 * Would moving `matchId` to (venueName, day, startAbs) for `durationMinutes`
 * collide with any other currently-scheduled match at that venue?
 * (Venue-open-hours / break-window checks are handled separately by the
 * session's free-interval list already built by buildSessions - callers
 * that also want that check should intersect the requested window against
 * `sessions` before calling this.)
 */
export function isSlotAvailable(scheduled, matchId, venueName, day, startAbs, durationMinutes) {
  const candidate = { startAbs, endAbs: startAbs + durationMinutes };
  return !otherBookings(scheduled, matchId).some(
    (b) => b.venueName === venueName && b.day === day && overlaps(b, candidate)
  );
}

/**
 * Commit a manual move: updates the `scheduled` map in place. Callers
 * should run conflictDetection.detectConflicts() afterwards (or check
 * isSlotAvailable() beforehand, as above) since this function itself does
 * not re-validate - it only writes the new slot.
 */
export function rescheduleMatch(scheduled, matchId, venueName, day, startAbs, durationMinutes) {
  const endAbs = startAbs + durationMinutes;
  const pad = (n) => String(n).padStart(2, '0');
  const toLabel = (abs) => {
    const d = new Date(abs * 60000);
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  scheduled.set(matchId, {
    venueName,
    day,
    startAbs,
    endAbs,
    startLabel: toLabel(startAbs),
    endLabel: toLabel(endAbs),
  });
  return scheduled.get(matchId);
}
