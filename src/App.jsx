import { useCallback, useMemo, useState } from 'react';
import Header from './components/Header.jsx';
import LeftPanel from './components/LeftPanel.jsx';
import ScheduleTable from './components/ScheduleTable.jsx';
import GroupsOverview from './components/GroupsOverview.jsx';
import AnalyticsDashboard from './components/AnalyticsDashboard.jsx';
import LandingPage from './components/LandingPage.jsx';
import PasswordGate, { isUnlocked } from './components/PasswordGate.jsx';
import { parseRosterFile, workbookFromSheets, triggerDownload } from './engine/xlsxIO.js';
import { exportScheduleToPdf } from './engine/pdfExport.js';
import { flattenVenues } from './engine/venueSetupIO.js';
import { buildAllMatches } from './engine/matchGenerator.js';
import { buildSessions, scheduleRounds, tournamentStart } from './engine/scheduler.js';
import { buildScheduleRows } from './engine/reportBuilder.js';
import './styles/app.css';

export default function App() {
  const [unlocked, setUnlocked] = useState(isUnlocked);
  const [showDashboard, setShowDashboard] = useState(false);

  const [fileName, setFileName] = useState('');
  const [entrants, setEntrants] = useState([]);
  const [parseErrors, setParseErrors] = useState([]);

  // Venues are configured in-app as a list of venue "cards", each with its
  // own sport restriction and one or more real day/open/close/break windows
  // (VenueSetup.jsx) — replacing the old flat name-list + single global
  // date-range inputs with something that actually reflects when a venue is
  // available.
  const [venues, setVenues] = useState([]);
  const [matchDuration, setMatchDuration] = useState(30);
  const [breakDuration, setBreakDuration] = useState(10);

  // Tournament stage format: 'knockout' keeps the existing behaviour exactly
  // as-is (one delegation-spread round per sport). 'groupStage' routes
  // through formats/groupStageKnockout.js — entrants are auto-split into
  // delegation-spread groups (same delegation only ever lands together as a
  // last resort), each group plays a round robin, then group winners meet
  // in a knockout stage.
  const [stageFormat, setStageFormat] = useState('knockout');
  const [groupSizeMode, setGroupSizeMode] = useState('numGroups'); // 'numGroups' | 'groupSize'
  const [numGroups, setNumGroups] = useState(4);
  const [groupSize, setGroupSize] = useState(4);

  const [generating, setGenerating] = useState(false);
  const [scheduleRows, setScheduleRows] = useState([]);
  const [genSummary, setGenSummary] = useState(null);
  const [genError, setGenError] = useState('');

  const handleFile = useCallback(async (file) => {
    setFileName(file.name);
    const { entrants: parsed, errors } = await parseRosterFile(file);
    setParseErrors(errors);
    setEntrants(parsed);
    setScheduleRows([]);
    setGenSummary(null);
  }, []);

  const rosterSummary = useMemo(() => {
    if (!entrants.length) return null;
    const sports = new Set(entrants.map((e) => e.sport));
    return { entrantCount: entrants.length, sportCount: sports.size };
  }, [entrants]);

  const sportOptions = useMemo(() => [...new Set(entrants.map((e) => e.sport))], [entrants]);

  const flatVenueRows = useMemo(() => flattenVenues(venues), [venues]);

  const canGenerate = entrants.length > 0 && flatVenueRows.length > 0 && matchDuration > 0;

  const handleGenerate = useCallback(() => {
    if (!canGenerate) {
      setGenError('Please upload a roster and add at least one venue with a valid day/time window first.');
      return;
    }
    setGenError('');
    setGenerating(true);
    try {
      const sessions = buildSessions(flatVenueRows);
      const start = tournamentStart(sessions);

      const formatName = stageFormat === 'groupStage' ? 'groupStageKnockout' : 'singleRoundDraw';
      const formatOptions =
        stageFormat === 'groupStage'
          ? groupSizeMode === 'groupSize'
            ? { groupSize: Math.max(2, Number(groupSize) || 4) }
            : { numGroups: Math.max(2, Number(numGroups) || 4) }
          : {};

      const { order, matchesBySport } = buildAllMatches(entrants, formatName, formatOptions);
      const settings = { durationMinutes: matchDuration, bufferMinutes: breakDuration };

      const scheduled = new Map();
      const unscheduled = [];
      for (const sportId of order) {
        const { scheduled: sch, unscheduled: unsch } = scheduleRounds(
          sessions,
          sportId,
          matchesBySport[sportId],
          settings,
          start
        );
        for (const [id, v] of sch) scheduled.set(id, v);
        unscheduled.push(...unsch);
      }

      const rows = buildScheduleRows(matchesBySport, scheduled, unscheduled);
      setScheduleRows(rows);
      const sports = new Set(entrants.map((e) => e.sport));
      setGenSummary({ entrantCount: entrants.length, sportCount: sports.size, matchCount: rows.length });
      if (unscheduled.length) {
        setGenError(
          `${unscheduled.length} match(es) could not be scheduled — add more venue-day capacity and regenerate.`
        );
      }
    } finally {
      setGenerating(false);
    }
  }, [canGenerate, flatVenueRows, entrants, matchDuration, breakDuration, stageFormat, groupSizeMode, numGroups, groupSize]);

  const handleExportExcel = useCallback((rows) => {
    const sheetRows = rows.map((r) => ({
      'Match #': r.matchNumber,
      Sport: r.sport,
      Group: r.group ? `Group ${r.group}` : '',
      'Team/Player A': r.teamA,
      'Delegation A': r.delegationA,
      'Team/Player B': r.teamB,
      'Delegation B': r.delegationB,
      Venue: r.venue,
      Date: r.date,
      Time: r.startTime ? `${r.startTime} - ${r.endTime}` : '',
    }));
    const wb = workbookFromSheets({ Schedule: sheetRows });
    triggerDownload(wb, 'tournament-schedule.xlsx');
  }, []);

  const handleExportPdf = useCallback((rows) => {
    exportScheduleToPdf(rows, 'tournament-schedule.pdf');
  }, []);

  const hasSchedule = scheduleRows.length > 0;

  if (!unlocked) {
    return <PasswordGate onUnlock={() => setUnlocked(true)} />;
  }

  if (!showDashboard) {
    return <LandingPage onOpenDashboard={() => setShowDashboard(true)} />;
  }

  return (
    <div className="app-shell">
      <Header summary={genSummary} onBack={() => setShowDashboard(false)} />
      <div className="app-body">
        <LeftPanel
          fileName={fileName}
          onFile={handleFile}
          parseErrors={parseErrors}
          rosterSummary={rosterSummary}
          sportOptions={sportOptions}
          venues={venues}
          onVenuesChange={setVenues}
          matchDuration={matchDuration}
          onMatchDurationChange={setMatchDuration}
          breakDuration={breakDuration}
          onBreakDurationChange={setBreakDuration}
          stageFormat={stageFormat}
          onStageFormatChange={setStageFormat}
          groupSizeMode={groupSizeMode}
          onGroupSizeModeChange={setGroupSizeMode}
          numGroups={numGroups}
          onNumGroupsChange={setNumGroups}
          groupSize={groupSize}
          onGroupSizeChange={setGroupSize}
          onGenerate={handleGenerate}
          canGenerate={canGenerate}
          generating={generating}
        />

        <main className="right-panel">
          {genError && <div className="banner banner-warning">{genError}</div>}

          {!hasSchedule && !genError && (
            <div className="empty-state card">
              <h2>No schedule generated yet</h2>
              <p>
                Upload a roster file, set up your venues' real availability on the left, then click
                <strong> Generate Schedule</strong> to see the match table and analytics here.
              </p>
            </div>
          )}

          {hasSchedule && (
            <>
              <ScheduleTable rows={scheduleRows} onExportExcel={handleExportExcel} onExportPdf={handleExportPdf} />
              <GroupsOverview rows={scheduleRows} />
              <AnalyticsDashboard
                rows={scheduleRows}
                venueRows={flatVenueRows}
                matchDuration={matchDuration}
                breakDuration={breakDuration}
              />
            </>
          )}
        </main>
      </div>
    </div>
  );
}
