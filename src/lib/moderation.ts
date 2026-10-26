import { Filter } from 'bad-words';

const filter = new Filter();
const PHONE = /(\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/;
const EMAIL = /[\w.+-]+@[\w-]+\.[\w.]+/;
// House number + street word. Public place names ("Kissena Park") don't match.
const ADDRESS = /\b\d{1,5}(-\d{1,4})?\s+(\w+\s){0,3}(street|st|avenue|ave|road|rd|boulevard|blvd|place|pl|lane|ln|drive|dr|court|ct|terrace|way)\b\.?/i;

/** Returns an error message, or null if the text is allowed. */
export function checkText(text: string): string | null {
  if (!text) return null;
  if (filter.isProfane(text)) return 'Remove offensive language';
  if (PHONE.test(text)) return 'No phone numbers';
  if (EMAIL.test(text)) return 'No email addresses';
  if (ADDRESS.test(text)) return 'No street addresses';
  return null;
}

export const MAX_EVENTS_PER_DAY = 5;
