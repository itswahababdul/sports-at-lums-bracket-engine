import { useState } from 'react';
import { emptyDay, makeVenue } from '../engine/venueSetupIO.js';

/**
 * Replaces the old "number of venues + flat name list" input with a proper
 * per-venue availability builder: each venue can have several day windows
 * (date + open/close time + an optional break), matching how tournament
 * venues actually work — a court might only be free 9am-1pm on day one but
 * all day on day two, or close for Friday prayer / lunch.
 */
export default function VenueSetup({ sports, venues, onChange }) {
  const [quickName, setQuickName] = useState('Venue');
  const [quickCount, setQuickCount] = useState(1);

  const addVenues = () => {
    const count = Math.max(1, Number(quickCount) || 1);
    const baseName = quickName.trim() || 'Venue';
    const startIdx = venues.length + 1;
    const additions = Array.from({ length: count }, (_, i) =>
      makeVenue(count === 1 ? baseName : `${baseName} ${startIdx + i}`, sports[0] || 'ALL')
    );
    onChange([...venues, ...additions]);
    setQuickCount(1);
  };

  const updateVenue = (id, patch) => onChange(venues.map((v) => (v.id === id ? { ...v, ...patch } : v)));
  const removeVenue = (id) => onChange(venues.filter((v) => v.id !== id));
  const updateDay = (venueId, dayId, patch) =>
    onChange(
      venues.map((v) =>
        v.id !== venueId ? v : { ...v, days: v.days.map((d) => (d.id === dayId ? { ...d, ...patch } : d)) }
      )
    );
  const addDay = (venueId) =>
    onChange(venues.map((v) => (v.id !== venueId ? v : { ...v, days: [...v.days, emptyDay()] })));
  const removeDay = (venueId, dayId) =>
    onChange(venues.map((v) => (v.id !== venueId ? v : { ...v, days: v.days.filter((d) => d.id !== dayId) })));

  return (
    <section className="input-card">
      <h2 className="input-card-title">Venues</h2>
      <p className="field-hint venue-setup-hint">
        Add each court or ground, which sport it hosts, and every day it's actually open — including the exact
        hours and any lunch/prayer break. This is what the scheduler uses to place matches for real.
      </p>

      <div className="venue-quick-add">
        <input
          className="venue-quick-input"
          value={quickName}
          onChange={(e) => setQuickName(e.target.value)}
          placeholder="Venue name"
        />
        <input
          className="venue-quick-input venue-quick-count"
          type="number"
          min="1"
          value={quickCount}
          onChange={(e) => setQuickCount(e.target.value)}
        />
        <button className="btn btn-sm" onClick={addVenues}>
          + Add venue{Number(quickCount) > 1 ? 's' : ''}
        </button>
      </div>

      {venues.length === 0 && <p className="empty-note">No venues yet — add at least one above.</p>}

      {venues.map((v) => (
        <div className="venue-card" key={v.id}>
          <div className="venue-card-header">
            <label className="field venue-name-field">
              <span>Name</span>
              <input value={v.venueName} onChange={(e) => updateVenue(v.id, { venueName: e.target.value })} />
            </label>
            <label className="field venue-sport-field">
              <span>Sport</span>
              <select value={v.sport} onChange={(e) => updateVenue(v.id, { sport: e.target.value })}>
                <option value="ALL">All sports</option>
                {sports.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <button className="btn btn-ghost btn-sm" onClick={() => removeVenue(v.id)}>
              Remove
            </button>
          </div>

          {v.days.map((d) => (
            <div className="venue-day-row" key={d.id}>
              <label>
                <span>Day</span>
                <input type="date" value={d.day} onChange={(e) => updateDay(v.id, d.id, { day: e.target.value })} />
              </label>
              <label>
                <span>Open</span>
                <input
                  type="time"
                  value={d.dayStart}
                  onChange={(e) => updateDay(v.id, d.id, { dayStart: e.target.value })}
                />
              </label>
              <label>
                <span>Close</span>
                <input
                  type="time"
                  value={d.dayEnd}
                  onChange={(e) => updateDay(v.id, d.id, { dayEnd: e.target.value })}
                />
              </label>
              <label className="venue-break-toggle">
                <input
                  type="checkbox"
                  checked={d.breakEnabled}
                  onChange={(e) => updateDay(v.id, d.id, { breakEnabled: e.target.checked })}
                />
                <span>Break</span>
              </label>
              {d.breakEnabled && (
                <>
                  <label>
                    <span>From</span>
                    <input
                      type="time"
                      value={d.breakStart}
                      onChange={(e) => updateDay(v.id, d.id, { breakStart: e.target.value })}
                    />
                  </label>
                  <label>
                    <span>To</span>
                    <input
                      type="time"
                      value={d.breakEnd}
                      onChange={(e) => updateDay(v.id, d.id, { breakEnd: e.target.value })}
                    />
                  </label>
                </>
              )}
              {v.days.length > 1 && (
                <button className="btn btn-ghost btn-sm" onClick={() => removeDay(v.id, d.id)}>
                  Remove day
                </button>
              )}
            </div>
          ))}
          <button className="btn-link" onClick={() => addDay(v.id)}>
            + Add another day
          </button>
        </div>
      ))}
    </section>
  );
}
