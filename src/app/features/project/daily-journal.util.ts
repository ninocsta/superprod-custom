import { DailyJournalEntry } from '../work-context/work-context.model';
import { Project } from './project.model';

type DailyJournalCarrier = Pick<Project, 'advancedCfg'>;

export const getDailyEntryByDay = (
  project: DailyJournalCarrier | null | undefined,
  dayStr: string,
): DailyJournalEntry | null => {
  if (!project) {
    return null;
  }
  return project.advancedCfg.dailyJournal?.entriesByDay?.[dayStr] || null;
};

export const upsertDailyEntryByDay = (
  project: Project,
  dayStr: string,
  entry: DailyJournalEntry,
): Project['advancedCfg'] => {
  const existingDailyJournal = project.advancedCfg.dailyJournal;
  return {
    ...project.advancedCfg,
    dailyJournal: {
      entriesByDay: {
        ...(existingDailyJournal?.entriesByDay || {}),
        [dayStr]: entry,
      },
    },
  };
};
