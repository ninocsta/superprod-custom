import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { map } from 'rxjs/operators';
import { DateService } from 'src/app/core/date/date.service';
import {
  DailyJournal,
  DailyJournalEntry,
} from 'src/app/features/config/global-config.model';
import { GlobalConfigService } from 'src/app/features/config/global-config.service';
import { T } from 'src/app/t.const';
import { InlineMarkdownComponent } from 'src/app/ui/inline-markdown/inline-markdown.component';

@Component({
  selector: 'daily-journal-page',
  templateUrl: './daily-journal-page.component.html',
  styleUrls: ['./daily-journal-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [MatIconButton, MatIcon, MatTooltip, TranslatePipe, InlineMarkdownComponent],
})
export class DailyJournalPageComponent {
  private readonly _activatedRoute = inject(ActivatedRoute);
  private readonly _router = inject(Router);
  private readonly _dateService = inject(DateService);
  private readonly _configService = inject(GlobalConfigService);

  readonly T = T;

  readonly dayStrSignal = toSignal(
    this._activatedRoute.paramMap.pipe(
      map((params) => params.get('dayStr') || this._dateService.todayStr()),
    ),
    { initialValue: this._dateService.todayStr() },
  );

  private readonly _cfg = this._configService.cfg;
  private readonly _dailyJournal = computed(
    () => this._cfg()?.dailyJournal || ({ entriesByDay: {} } as DailyJournal),
  );

  readonly currentDailyEntry = computed<DailyJournalEntry | null>(() => {
    const dayStr = this.dayStrSignal();
    return this._dailyJournal().entriesByDay?.[dayStr] || null;
  });

  readonly dailyYesterday = computed(() => this.currentDailyEntry()?.yesterday || '');
  readonly dailyTodayPlan = computed(() => this.currentDailyEntry()?.todayPlan || '');
  readonly dailyBlockers = computed(() => this.currentDailyEntry()?.blockers || '');
  readonly dailyNotes = computed(() => this.currentDailyEntry()?.notes || '');

  updateDailyField(
    field: 'yesterday' | 'todayPlan' | 'blockers' | 'notes',
    value: string,
  ): void {
    const dayStr = this.dayStrSignal();
    const currentEntry = this._dailyJournal().entriesByDay?.[dayStr];
    const nextEntry: DailyJournalEntry = {
      yesterday: currentEntry?.yesterday || '',
      todayPlan: currentEntry?.todayPlan || '',
      blockers: currentEntry?.blockers || '',
      notes: currentEntry?.notes,
      updatedAt: Date.now(),
      [field]: value,
    };
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
