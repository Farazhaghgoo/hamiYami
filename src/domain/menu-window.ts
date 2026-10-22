import { addDays, romeDateOf, type CivilDate } from "./time";

/** The browsable menu covers the seven days starting tomorrow (Rome time). */
export const MENU_DAYS = 7;
/** Cooks can schedule offerings up to this many days ahead. */
export const MAX_SCHEDULE_DAYS_AHEAD = 30;

export function todayInRome(now: Date = new Date()): CivilDate {
  return romeDateOf(now);
}

export interface MenuWindow {
  anchor: CivilDate;
  from: CivilDate;
  to: CivilDate;
  dates: CivilDate[];
}

export function menuWindow(anchor: CivilDate): MenuWindow {
  const dates = Array.from({ length: MENU_DAYS }, (_, i) => addDays(anchor, i + 1));
  return { anchor, from: dates[0]!, to: dates[dates.length - 1]!, dates };
}

/** Dates a cook may pick for a new offering. */
export function schedulableRange(anchor: CivilDate): { min: CivilDate; max: CivilDate } {
  return { min: addDays(anchor, 1), max: addDays(anchor, MAX_SCHEDULE_DAYS_AHEAD) };
}
