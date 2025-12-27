
export interface DailyEntry {
  date: string; // YYYY-MM-DD
  imageUrl: string; // base64
  caption: string;
}

export interface MonthlySummary {
  month: string; // YYYY-MM
  summary: string;
  theme: string;
}

export enum AppView {
  CALENDAR = 'calendar',
  TODAY = 'today',
  SUMMARY = 'summary',
  HISTORY = 'history'
}
