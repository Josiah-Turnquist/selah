/**
 * Hands the widget snapshot to the extension via the shared App Group and
 * pokes WidgetKit to re-read its timelines. The native module only exists in
 * builds that ship the widget extension; on older binaries (and on Android)
 * every call is a silent no-op, so this file is always safe to ship over OTA.
 */

import { Platform } from 'react-native';

import type { AppData } from '@/lib/store/types';
import { buildWidgetSnapshot } from '@/lib/widgets/snapshot';

export const APP_GROUP = 'group.com.josiahturnq.selah';
const SNAPSHOT_KEY = 'widgetSnapshot';

type Storage = { set(key: string, value: string): void };
let storage: Storage | null | undefined;

function getStorage(): Storage | null {
  if (storage === undefined) {
    try {
      const { ExtensionStorage } = require('@bacons/apple-targets');
      storage = new ExtensionStorage(APP_GROUP) as Storage;
    } catch {
      storage = null;
    }
  }
  return storage;
}

export function syncWidgets(data: AppData, now: number = Date.now()): void {
  if (Platform.OS !== 'ios') return;
  try {
    const s = getStorage();
    if (!s) return;
    s.set(SNAPSHOT_KEY, JSON.stringify(buildWidgetSnapshot(data, now)));
    const { ExtensionStorage } = require('@bacons/apple-targets');
    ExtensionStorage.reloadWidget();
  } catch {
    // Widgets are best-effort; they must never touch app stability.
  }
}
