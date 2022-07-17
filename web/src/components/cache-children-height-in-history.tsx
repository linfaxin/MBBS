import React, { useLayoutEffect, useRef, useState } from 'react';
import { getPageStateWhenPop, setPageState } from '@/utils/use-page-history-hooks';

const CacheChildrenHeightInHistory: React.FC<{
  historyKey: string;
}> = (props) => {
  const { historyKey, children } = props;
  const divRef = useRef<HTMLDivElement>(null);
  const [minHeight, setMinHeight] = useState(() => getPageStateWhenPop(historyKey));
  useLayoutEffect(() => {
    const timeoutId = setTimeout(() => {
      setMinHeight(undefined); // 清除初始化时 设置的默认最小高度
    }, 2000);
    return () => {
      clearTimeout(timeoutId);
      // 卸载时记录高度
      setPageState(historyKey, divRef.current?.offsetHeight);
    };
  }, []);

  return (
    <div style={{ minHeight }} ref={divRef}>
      {children}
    </div>
  );
};

export default CacheChildrenHeightInHistory;
