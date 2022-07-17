import debounce from 'lodash.debounce';

const LocalStorageKey = 'MBBS-VIEW-THREAD-RECORDS';

let recordsMap: Record<string, 1> = {};
try {
  recordsMap = JSON.parse(localStorage.getItem(LocalStorageKey) || '{}');
} catch (e) {}

const debounceFlushRecords = debounce(
  () => {
    localStorage.setItem(LocalStorageKey, JSON.stringify(recordsMap));
  },
  500,
  { maxWait: 3000 },
);

export function hasViewThread(id: number | string): boolean {
  return !!recordsMap[String(id)];
}

export function markThreadViewed(id: number | string) {
  recordsMap[String(id)] = 1;
  debounceFlushRecords();
}
