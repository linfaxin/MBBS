import React, { useLayoutEffect, useMemo, useRef } from 'react';
import Vditor from 'vditor';
import transformWillRenderHtml from '@/components/vditor/transform-will-render-html';
import hashString from '@/utils/hash-string';
import 'vditor/dist/index.css';
import './vditor-reset.less';
import { useTheme } from '@mui/material';
import ApiUI from '@/api-ui';
import { vditorCDNEmojiPathPrefix, vditorCDNThemePathPrefix, vditorCDNUrlPrefix } from '@/components/vditor/util';

const markdownLastRenderHeight: Record<number, number | undefined> = {}; // <markdown-hash, height>

export declare type MarkdownPreviewProps = {
  markdown: string;
  transformHtml?: (html: string) => string | undefined;
  className?: string;
  style?: React.CSSProperties;
  afterRender?: (rootElement: HTMLElement) => void;
};

const MarkdownPreview: React.FC<MarkdownPreviewProps> = (props) => {
  const { markdown, transformHtml, style, afterRender, ...otherProps } = props;
  const theme = useTheme();
  const ref = useRef<HTMLDivElement>(null);
  const markdownHash = useMemo(() => hashString(markdown), [markdown]);

  useLayoutEffect(() => {
    return () => {
      // 卸载时记录内容高度
      if (!ref.current) return;
      ref.current.style.minHeight = '';
      markdownLastRenderHeight[markdownHash] = ref.current.offsetHeight || undefined;
    };
  }, [markdownHash]);

  useLayoutEffect(() => {
    if (!ref.current) return;
    if ('IntersectionObserver' in window) {
      // 覆盖懒加载图片的实现（调整了加载图片的实现，去除了额外的 height 样式）
      (window as any).vditorImageIntersectionObserver = new IntersectionObserver((entries) => {
        entries.forEach((entrie) => {
          if (
            (typeof entrie.isIntersecting === 'undefined' ? entrie.intersectionRatio !== 0 : entrie.isIntersecting) &&
            entrie.target.getAttribute('data-src') &&
            entrie.target.tagName === 'IMG'
          ) {
            loadLazyImage(entrie.target as HTMLImageElement);
          }
        });
      });
    }

    Vditor.preview(ref.current, markdown, {
      cdn: vditorCDNUrlPrefix,
      mode: theme.palette.mode === 'dark' ? 'dark' : 'light',
      emojiPath: vditorCDNEmojiPathPrefix,
      theme: {
        current: theme.palette.mode === 'dark' ? 'dark' : 'light',
        path: vditorCDNThemePathPrefix,
      },
      lazyLoadImage: markdownLastRenderHeight[markdownHash] ? undefined : require('./img-loading-image.png'),
      transform: (html) => {
        html = transformWillRenderHtml(html, true);
        return transformHtml?.(html) || html;
      },
      after() {
        afterRender?.(ref.current as HTMLElement);
      },
    });

    // fix 同页面 preview 多个时，懒加载图片不显示 bug
    const loopCheckImageShowId = setInterval(() => {
      Array.from(ref.current?.querySelectorAll('img[data-src]') || []).forEach((img) => {
        const bound = img.getBoundingClientRect();
        if (
          bound.top >= document.documentElement.clientHeight ||
          bound.bottom <= 0 ||
          bound.left >= document.documentElement.clientWidth ||
          bound.right <= 0
        ) {
          // 元素不可见
          return;
        }
        loadLazyImage(img as HTMLImageElement);
      });
    }, 1000);
    return () => clearInterval(loopCheckImageShowId);
  }, [markdown, markdownHash]);

  return (
    <div
      {...otherProps}
      ref={ref}
      style={{
        minHeight: markdownLastRenderHeight[markdownHash] || '',
        overflow: 'visible', // 避免 帖子内容区域 可能出现滚动条
        ...style,
      }}
      onClickCapture={(e) => {
        if (!(e.target instanceof HTMLElement)) return;
        if (e.target.tagName === 'A') {
          // 点击链接
          e.preventDefault();
          const url = (e.target as HTMLAnchorElement).href;
          if (ApiUI.onClickPreviewLink) {
            ApiUI.onClickPreviewLink(url);
          } else {
            window.open(url);
          }
        } else if (e.target.tagName === 'IMG') {
          // 点击图片
          const src = (e.target as HTMLImageElement).src;
          if (!src) return;
          if (ApiUI.onClickPreviewImage) {
            ApiUI.onClickPreviewImage(src);
          }
        }
      }}
    >
      <span style={{ opacity: 0.5, fontSize: 12 }}>加载中...</span>
    </div>
  );
};

function loadLazyImage(img: HTMLImageElement) {
  const imgSrc = img.getAttribute('data-src');
  img.removeAttribute('data-src');
  if (!imgSrc) return;
  const loadImage = new Image();
  loadImage.onload = () => (img.src = imgSrc);
  loadImage.src = imgSrc;
}

export default MarkdownPreview;
