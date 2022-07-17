import { Dispatch, SetStateAction, useCallback, useMemo, useState } from 'react';
import { history } from 'umi';
import { Thread } from '@/api/thread';

export function usePageState<S>(historyKey: string, initialState?: S | (() => S)): [S, Dispatch<SetStateAction<S>>];
export function usePageState<S = undefined>(
  historyKey: string,
  initialState?: S | (() => S),
): [S | undefined, Dispatch<SetStateAction<S | undefined>>] {
  const initialStateOrInHistoryValue = useMemo(() => getPageStateWhenPop(historyKey, initialState), []);

  const [value, setValue] = useState(initialStateOrInHistoryValue);

  const wrapSetValue = useCallback((newValue) => {
    setValue(newValue);
    setPageState(historyKey, newValue); // state 变化，设置入全局数据，用于页面返回后恢复
  }, []);

  return [value, wrapSetValue];
}

export function getPageStateWhenPop(historyKey: string, fallback?: any): any {
  if (history.action !== 'POP') return fallback;
  const pageStateData = getCurrentPageState().data;
  if (historyKey in pageStateData) {
    return pageStateData[historyKey];
  }
  return fallback;
}

export function setPageState(historyKey: string, historyValue: any) {
  getCurrentPageState().data[historyKey] = historyValue;
}

export function clearPageState(pathname: string) {
  Object.values(AllPageStateMap).forEach((pageState) => {
    if (pageState.pathname === pathname) {
      pageState.data = {};
    }
  });
}

export function updateThreadInHistoryData(newThread: Thread) {
  if (!newThread) return;
  Object.values(AllPageStateMap).forEach((pageState) => {
    const threadList: Thread[] = pageState.data['thread-list'];
    if (threadList?.length) {
      threadList.forEach((t) => {
        if (t?.id === newThread.id) {
          Object.assign(t, newThread);
        }
      });
    }
  });
}

export function removeThreadInHistoryData(willRemoveThread: Thread) {
  if (!willRemoveThread) return;
  Object.values(AllPageStateMap).forEach((pageState) => {
    if (pageState.data['thread-list']) {
      pageState.data['thread-list'] = pageState.data['thread-list'].filter((t: Thread) => t.id !== willRemoveThread.id);
    }
  });
}

const AllPageStateMap: Record<string, PageState> = {};
// @ts-ignore
window.AllPageStateMap = AllPageStateMap;

function getCurrentPageState() {
  if (!(window.history.state || {}).pageKey) {
    window.history.replaceState(
      {
        ...window.history.state,
        pageKey: `${Date.now()}_${Math.random()}`,
      },
      null as any,
    );
  }
  const pageKey = window.history.state.pageKey;
  if (!AllPageStateMap[pageKey]) {
    AllPageStateMap[pageKey] = new PageState(pageKey, history.location.pathname);
  }
  return AllPageStateMap[pageKey];
}

class PageState {
  readonly key: string;
  readonly pathname: string;
  data: Record<string, any> = {};

  constructor(key: string, pathname: string) {
    this.key = key;
    this.pathname = pathname;
  }
}
