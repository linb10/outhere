import { hasFirebase } from '@/lib/env';
import type { DataService } from './DataService';

let instance: Promise<DataService> | null = null;

/** Firebase when configured, demo otherwise. Firebase SDK is only loaded when needed. */
export function loadDataService(): Promise<DataService> {
  instance ??= hasFirebase
    ? import('./FirebaseDataService').then((m) => new m.FirebaseDataService())
    : import('./DemoDataService').then((m) => new m.DemoDataService());
  return instance;
}
