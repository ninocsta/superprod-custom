import { Project } from './project.model';

export const createProject = (
  { id = 'DEFAULT', title = 'DEFAULT', ...rest }: Partial<Project> = {
    id: 'DEFAULT',
    title: 'DEFAULT',
  },
): Project => {
  return {
    id,
    title,
    taskIds: [],
    backlogTaskIds: [],
    noteIds: [],
    isEnableBacklog: false,
    isEnableDailyTracking: false,
    issueIntegrationCfgs: {},
    advancedCfg: {
      worklogExportSettings: {
        cols: ['DATE', 'START', 'END', 'TIME_CLOCK', 'TITLES_INCLUDING_SUB'],
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
    ...rest,
  } as Project;
};
