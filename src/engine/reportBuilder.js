// reportBuilder.js
// Flattens generated matches + their scheduled venue/time slot into plain
// row objects used by the schedule table, the exports, and the analytics
// dashboard.

export function buildScheduleRows(matchesBySport, scheduled, unscheduledIds) {
  const rows = [];
  let matchNumber = 0;
  for (const [sport, rounds] of Object.entries(matchesBySport)) {
    for (const round of rounds) {
      for (const m of round) {
        matchNumber += 1;
        const slot = scheduled.get(m.id);
        const isUnscheduled = unscheduledIds.includes(m.id);
        rows.push({
          matchId: m.id,
          matchNumber,
          sport,
          teamA: m.entrantA.name,
          delegationA: m.entrantA.delegation,
          teamB: m.entrantB.name,
          delegationB: m.entrantB.delegation,
          group: m.group || null,
          venue: slot?.venueName ?? (isUnscheduled ? 'Unscheduled' : ''),
          date: slot?.day ?? (isUnscheduled ? '—' : ''),
          startTime: slot?.startLabel ?? '',
          endTime: slot?.endLabel ?? '',
          clash: m.clash || '',
          unscheduled: isUnscheduled,
        });
      }
    }
  }
  return rows;
}
