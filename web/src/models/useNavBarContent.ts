import { ReactNode, useState } from 'react';
import ApiUI from '@/api-ui';

export declare type NavBarContent = Array<{
  title: string;
  href?: string;
  categoryId?: number;
}>;

export default function useNavBarContent() {
  const [content, setContent] = useState<NavBarContent>([]);
  const [navBackBtn, setNavBackBtn] = useState<boolean>(false);
  const [actionBtn, setActionBtn] = useState<ReactNode>(null);

  return {
    content,
    navBackBtn,
    setNavBackBtn,
    actionBtn,
    setActionBtn,
    getLastItemTitle() {
      return [...content].pop()?.title;
    },
    setContentSiteName() {
      this.setContent('');
    },
    setContentEmpty() {
      this.setContent(' ');
    },
    setContent(content: string | NavBarContent) {
      if (typeof content === 'string') {
        content = [{ title: content }];
      }
      setContent(content);
      ApiUI.onTopBarTitleChange?.([...content].pop()?.title);
    },
    hasCategory(categoryId: number) {
      return content.some((item) => item.categoryId === categoryId);
    },
  };
}
