import { settingApi } from '@/api';
import { Setting } from '@/api/setting';
import { useEffect, useState } from 'react';
import ApiUI from '@/api-ui';

let initSetting: Setting;

export async function initBBSSetting() {
  initSetting = await settingApi.getAll();
  ApiUI.onSettingChange?.(initSetting);
  return initSetting;
}

const onSettingChangeListeners = new Set<() => void>();
function triggerSettingChanged() {
  if (ApiUI.onSettingChange) {
    ApiUI.onSettingChange(initSetting);
  }
  onSettingChangeListeners.forEach((l) => l());
}

export default function useBBSSetting() {
  const [setting, setSetting] = useState(initSetting);

  useEffect(() => {
    const listener = () => {
      setSetting(initSetting);
    };
    onSettingChangeListeners.add(listener);
    return () => {
      onSettingChangeListeners.delete(listener);
    };
  }, []);

  return {
    ...setting,
    replace(newSetting: Setting) {
      initSetting = newSetting;
      triggerSettingChanged();
    },
    update<T extends keyof Setting>(key: T, value: Setting[T]) {
      this.replace({
        ...setting,
        [key]: value,
      });
    },
    batchUpdate(update: Partial<Setting>) {
      this.replace({
        ...setting,
        ...update,
      });
    },
  };
}
