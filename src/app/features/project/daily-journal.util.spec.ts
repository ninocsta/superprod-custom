import { Project } from './project.model';
import { getDailyEntryByDay, upsertDailyEntryByDay } from './daily-journal.util';

describe('daily journal util', () => {
  const baseProject = {
    id: 'P1',
    title: 'Project 1',
    taskIds: [],
    backlogTaskIds: [],
    noteIds: [],
    advancedCfg: {
      worklogExportSettings: {
        cols: ['DATE'],
        roundWorkTimeTo: null,
        roundStartTimeTo: null,
        roundEndTimeTo: null,
        separateTasksBy: ' | ',
        groupBy: 'DATE',
      },
      dailyJournal: {
        entriesByDay: {},
      },
    },
    theme: {},
  } as unknown as Project;

  it('should return null when entry does not exist', () => {
    expect(getDailyEntryByDay(baseProject, '2026-05-12')).toBeNull();
  });

  it('should upsert entry by day without losing previous day', () => {
    const withFirstDay = upsertDailyEntryByDay(baseProject, '2026-05-11', {
      yesterday: 'done A',
      todayPlan: 'do B',
      blockers: 'none',
      notes: 'note A',
      updatedAt: 1,
    });

    const withSecondDay = upsertDailyEntryByDay(
      { ...baseProject, advancedCfg: withFirstDay },
      '2026-05-12',
      {
        yesterday: 'done B',
        todayPlan: 'do C',
        blockers: 'waiting review',
        notes: 'note B',
        updatedAt: 2,
      },
    );

    expect(withSecondDay.dailyJournal?.entriesByDay['2026-05-11']).toEqual({
      yesterday: 'done A',
      todayPlan: 'do B',
      blockers: 'none',
      notes: 'note A',
      updatedAt: 1,
    });
    expect(withSecondDay.dailyJournal?.entriesByDay['2026-05-12']).toEqual({
      yesterday: 'done B',
      todayPlan: 'do C',
      blockers: 'waiting review',
      notes: 'note B',
      updatedAt: 2,
    });
  });

  it('should keep worklogExportSettings unchanged when upserting', () => {
    const updated = upsertDailyEntryByDay(baseProject, '2026-05-12', {
      yesterday: 'done',
      todayPlan: 'plan',
      blockers: 'none',
      notes: '',
      updatedAt: 3,
    });

    expect(updated.worklogExportSettings).toEqual(
      baseProject.advancedCfg.worklogExportSettings,
    );
  });
});
