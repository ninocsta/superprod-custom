import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { Store } from '@ngrx/store';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { map } from 'rxjs/operators';
import { NavigateToTaskService } from 'src/app/core-ui/navigate-to-task/navigate-to-task.service';
import { DateService } from 'src/app/core/date/date.service';
import {
  DailyJournal,
  DailyJournalEntry,
} from 'src/app/features/config/global-config.model';
import { GlobalConfigService } from 'src/app/features/config/global-config.service';
import { Task } from 'src/app/features/tasks/task.model';
import { SelectTaskMinimalComponent } from 'src/app/features/tasks/select-task/select-task-minimal/select-task-minimal.component';
import { selectAllTasks } from 'src/app/features/tasks/store/task.selectors';
import { TaskService } from 'src/app/features/tasks/task.service';
import { T } from 'src/app/t.const';

type DailyTextField = 'yesterday' | 'todayPlan' | 'blockers' | 'notes';
type DailyTaskField = 'yesterdayTaskIds' | 'todayPlanTaskIds';

@Component({
  selector: 'daily-journal-page',
  templateUrl: './daily-journal-page.component.html',
  styleUrls: ['./daily-journal-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    MatIconButton,
    MatIcon,
    MatTooltip,
    TranslatePipe,
    SelectTaskMinimalComponent,
  ],
})
export class DailyJournalPageComponent {
  private readonly _activatedRoute = inject(ActivatedRoute);
  private readonly _router = inject(Router);
  private readonly _dateService = inject(DateService);
  private readonly _configService = inject(GlobalConfigService);
  private readonly _store = inject(Store);
  private readonly _navigateToTaskService = inject(NavigateToTaskService);
  private readonly _taskService = inject(TaskService);

  readonly T = T;

  readonly dayStrSignal = toSignal(
    this._activatedRoute.paramMap.pipe(
      map((params) => params.get('dayStr') || this._dateService.todayStr()),
    ),
    { initialValue: this._dateService.todayStr() },
  );

  private readonly _cfg = this._configService.cfg;
  private readonly _allTasks = this._store.selectSignal(selectAllTasks);
  private readonly _allTasksById = computed(() => {
    const taskMap = new Map<string, Task>();
    this._allTasks().forEach((task) => {
      taskMap.set(task.id, task);
    });
    return taskMap;
  });
  private readonly _dailyJournal = computed(
    () => this._cfg()?.dailyJournal || ({ entriesByDay: {} } as DailyJournal),
  );
  private readonly _taskSearchInputBySlot = signal<Record<string, string>>({});

  readonly nextDayStrSignal = computed(() => this._shiftDbDay(this.dayStrSignal(), 1));
  readonly todayStr = computed(() => this._dateService.todayStr());
  readonly tomorrowStr = computed(() => this._shiftDbDay(this.todayStr(), 1));
  readonly visibleDayEntries = computed(() => [
    {
      dayStr: this.dayStrSignal(),
      label:
        this.dayStrSignal() === this.todayStr()
          ? T.PDS.DAILY_TODAY
          : this.dayStrSignal() === this.tomorrowStr()
            ? T.PDS.DAILY_TOMORROW
            : null,
    },
    {
      dayStr: this.nextDayStrSignal(),
      label:
        this.nextDayStrSignal() === this.todayStr()
          ? T.PDS.DAILY_TODAY
          : this.nextDayStrSignal() === this.tomorrowStr()
            ? T.PDS.DAILY_TOMORROW
            : T.PDS.DAILY_NEXT_DAY,
    },
  ]);

  getDailyField(dayStr: string, field: DailyTextField): string {
    const entry = this._getEntry(dayStr);
    return (entry?.[field] as string | undefined) || '';
  }

  updateDailyField(dayStr: string, field: DailyTextField, value: string): void {
    const currentEntry = this._createEntry(dayStr);
    const nextEntry: DailyJournalEntry = { ...currentEntry, [field]: value };
    this._saveEntry(dayStr, nextEntry);
  }

  getLinkedTasks(dayStr: string, field: DailyTaskField): Task[] {
    const linkedTaskIds =
      field === 'yesterdayTaskIds'
        ? this._getEntry(dayStr)?.yesterdayTaskIds || []
        : this._getEntry(dayStr)?.todayPlanTaskIds || [];
    const taskMap = this._allTasksById();
    return linkedTaskIds
      .map((taskId) => taskMap.get(taskId))
      .filter((task): task is Task => !!task);
  }

  addTaskToDaily(dayStr: string, field: DailyTaskField, taskId: string): void {
    if (!taskId) {
      return;
    }

    const currentEntry = this._createEntry(dayStr);
    const currentTaskIds =
      field === 'yesterdayTaskIds'
        ? currentEntry.yesterdayTaskIds || []
        : currentEntry.todayPlanTaskIds || [];
    if (currentTaskIds.includes(taskId)) {
      return;
    }

    const nextEntry: DailyJournalEntry =
      field === 'yesterdayTaskIds'
        ? {
            ...currentEntry,
            yesterdayTaskIds: [...currentTaskIds, taskId],
          }
        : {
            ...currentEntry,
            todayPlanTaskIds: [...currentTaskIds, taskId],
          };
    this._saveEntry(dayStr, nextEntry);
  }

  removeTaskFromDaily(dayStr: string, field: DailyTaskField, taskId: string): void {
    const currentEntry = this._createEntry(dayStr);
    const currentTaskIds =
      field === 'yesterdayTaskIds'
        ? currentEntry.yesterdayTaskIds || []
        : currentEntry.todayPlanTaskIds || [];
    const nextTaskIds = currentTaskIds.filter((id) => id !== taskId);
    const nextEntry: DailyJournalEntry =
      field === 'yesterdayTaskIds'
        ? {
            ...currentEntry,
            yesterdayTaskIds: nextTaskIds,
          }
        : {
            ...currentEntry,
            todayPlanTaskIds: nextTaskIds,
          };
    this._saveEntry(dayStr, nextEntry);
  }

  openTask(taskId: string): void {
    void this._navigateToTaskService.navigate(taskId);
  }

  trackByTaskId(_index: number, task: Task): string {
    return task.id;
  }

  trackByDayStr(_index: number, item: { dayStr: string }): string {
    return item.dayStr;
  }

  onTaskPicked(
    dayStr: string,
    field: DailyTaskField,
    task: Task | null | undefined,
  ): void {
    if (!task?.id) {
      return;
    }
    this.addTaskToDaily(dayStr, field, task.id);
    this.setTaskSearchInput(dayStr, field, '');
  }

  onDailyTextInput(dayStr: string, field: DailyTextField, event: Event): void {
    const target = event.target as HTMLTextAreaElement | null;
    this.updateDailyField(dayStr, field, target?.value || '');
  }

  setTaskSearchInput(dayStr: string, field: DailyTaskField, value: string): void {
    const slotKey = this._getTaskSlotKey(dayStr, field);
    this._taskSearchInputBySlot.update((prev) => ({
      ...prev,
      [slotKey]: value,
    }));
  }

  getTaskSearchInput(dayStr: string, field: DailyTaskField): string {
    const slotKey = this._getTaskSlotKey(dayStr, field);
    return this._taskSearchInputBySlot()[slotKey] || '';
  }

  canCreateTaskFromSearch(dayStr: string, field: DailyTaskField): boolean {
    const query = this.getTaskSearchInput(dayStr, field).trim();
    if (!query) {
      return false;
    }
    const queryLc = query.toLowerCase();
    return !this._allTasks().some((task) => task.title?.toLowerCase().includes(queryLc));
  }

  createTaskFromSearch(dayStr: string, field: DailyTaskField): void {
    const title = this.getTaskSearchInput(dayStr, field).trim();
    if (!title || !this.canCreateTaskFromSearch(dayStr, field)) {
      return;
    }
    const taskId = this._taskService.add(title, false, {});
    this.addTaskToDaily(dayStr, field, taskId);
    this.setTaskSearchInput(dayStr, field, '');
  }

  onTaskSearchKeyDown(dayStr: string, field: DailyTaskField, event: KeyboardEvent): void {
    if (event.key === 'Enter' && this.canCreateTaskFromSearch(dayStr, field)) {
      event.preventDefault();
      this.createTaskFromSearch(dayStr, field);
    }
  }

  private _getTaskSlotKey(dayStr: string, field: DailyTaskField): string {
    return `${dayStr}::${field}`;
  }

  private _saveEntry(dayStr: string, nextEntry: DailyJournalEntry): void {
    this._configService.updateSection(
      'dailyJournal',
      {
        entriesByDay: {
          ...this._dailyJournal().entriesByDay,
          [dayStr]: nextEntry,
        },
      },
      true,
    );
  }

  private _getEntry(dayStr: string): DailyJournalEntry | null {
    return this._dailyJournal().entriesByDay?.[dayStr] || null;
  }

  private _createEntry(dayStr: string): DailyJournalEntry {
    const currentEntry = this._getEntry(dayStr);
    return {
      yesterday: currentEntry?.yesterday || '',
      todayPlan: currentEntry?.todayPlan || '',
      blockers: currentEntry?.blockers || '',
      notes: currentEntry?.notes || '',
      yesterdayTaskIds: currentEntry?.yesterdayTaskIds || [],
      todayPlanTaskIds: currentEntry?.todayPlanTaskIds || [],
      updatedAt: Date.now(),
    };
  }

  navigateToPreviousDailyDay(): void {
    this._navigateToDailyDay(this._shiftDbDay(this.dayStrSignal(), -1));
  }

  navigateToNextDailyDay(): void {
    this._navigateToDailyDay(this._shiftDbDay(this.dayStrSignal(), 1));
  }

  onDailyDatePick(dayStr: string): void {
    if (!dayStr) {
      return;
    }
    this._navigateToDailyDay(dayStr);
  }

  private _navigateToDailyDay(dayStr: string): void {
    const todayStr = this._dateService.todayStr();
    if (dayStr === todayStr) {
      void this._router.navigate(['/daily']);
      return;
    }
    void this._router.navigate(['/daily', dayStr]);
  }

  private _shiftDbDay(dayStr: string, delta: number): string {
    const d = new Date(`${dayStr}T12:00:00`);
    d.setDate(d.getDate() + delta);
    return this._dateService.todayStr(d);
  }
}
