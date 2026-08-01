import { useMemo, useState } from 'react';

const COLUMNS = [
  { key: 'matchNumber', label: 'Match #' },
  { key: 'sport', label: 'Sport' },
  { key: 'group', label: 'Group' },
  { key: 'teamA', label: 'Team / Player A' },
  { key: 'delegationA', label: 'Delegation A' },
  { key: 'teamB', label: 'Team / Player B' },
  { key: 'delegationB', label: 'Delegation B' },
  { key: 'venue', label: 'Venue' },
  { key: 'date', label: 'Date' },
  { key: 'time', label: 'Time' },
];

export default function ScheduleTable({ rows, onExportExcel, onExportPdf }) {
  const [search, setSearch] = useState('');
  const [sportFilter, setSportFilter] = useState('');
  const [venueFilter, setVenueFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [sortKey, setSortKey] = useState('matchNumber');
  const [sortDir, setSortDir] = useState('asc');

  const options = useMemo(() => {
    const uniq = (key) => [...new Set(rows.map((r) => r[key]).filter(Boolean))].sort();
    return { sport: uniq('sport'), venue: uniq('venue'), date: uniq('date'), group: uniq('group') };
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (sportFilter && r.sport !== sportFilter) return false;
      if (venueFilter && r.venue !== venueFilter) return false;
      if (dateFilter && r.date !== dateFilter) return false;
      if (groupFilter && r.group !== groupFilter) return false;
      if (!q) return true;
      return (
        r.teamA.toLowerCase().includes(q) ||
        r.teamB.toLowerCase().includes(q) ||
        r.delegationA.toLowerCase().includes(q) ||
        r.delegationB.toLowerCase().includes(q) ||
        r.sport.toLowerCase().includes(q) ||
        r.venue.toLowerCase().includes(q)
      );
    });
  }, [rows, search, sportFilter, venueFilter, dateFilter, groupFilter]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      let av = a[sortKey];
      let bv = b[sortKey];
      if (sortKey === 'time') {
        av = a.startTime || '';
        bv = b.startTime || '';
      }
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDir === 'asc' ? av - bv : bv - av;
      }
      const cmp = String(av ?? '').localeCompare(String(bv ?? ''), undefined, { numeric: true });
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return copy;
  }, [filtered, sortKey, sortDir]);

  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  return (
    <section className="card table-card">
      <div className="table-toolbar">
        <input
          className="search-input"
          type="text"
          placeholder="Search team, delegation, sport, venue…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={sportFilter} onChange={(e) => setSportFilter(e.target.value)}>
          <option value="">All sports</option>
          {options.sport.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
        <select value={venueFilter} onChange={(e) => setVenueFilter(e.target.value)}>
          <option value="">All venues</option>
          {options.venue.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
        <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}>
          <option value="">All dates</option>
          {options.date.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
        {options.group.length > 0 && (
          <select value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)}>
            <option value="">All groups</option>
            {options.group.map((o) => (
              <option key={o} value={o}>Group {o}</option>
            ))}
          </select>
        )}
        <span className="table-count">{sorted.length} of {rows.length} matches</span>
        <div className="table-toolbar-actions">
          <button className="btn btn-outline" onClick={() => onExportExcel(sorted)}>
            Export to Excel
          </button>
          <button className="btn btn-outline" onClick={() => onExportPdf(sorted)}>
            Export to PDF
          </button>
        </div>
      </div>

      <div className="table-scroll">
        <table className="schedule-table">
          <thead>
            <tr>
              {COLUMNS.map((c) => (
                <th key={c.key} onClick={() => toggleSort(c.key)}>
                  {c.label} {sortKey === c.key ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr key={r.matchId} className={r.unscheduled ? 'row-warning' : ''}>
                <td>{r.matchNumber}</td>
                <td>{r.sport}</td>
                <td>{r.group ? `Group ${r.group}` : '—'}</td>
                <td>{r.teamA}</td>
                <td>{r.delegationA}</td>
                <td>{r.teamB}</td>
                <td>{r.delegationB}</td>
                <td>{r.venue || '—'}</td>
                <td>{r.date || '—'}</td>
                <td>{r.startTime ? `${r.startTime} – ${r.endTime}` : '—'}</td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={COLUMNS.length} className="empty-row">
                  No matches match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
