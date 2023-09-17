import { JSDOM } from 'jsdom';

require('vditor/dist/js/lute/lute.min');

const Lute = (global as any).Lute;
const lute = Lute.New();

export default function htmlToPureText(html: string): string {
  const { document } = new JSDOM(html).window;
  document.body.innerHTML = html;

  // 索引隐藏 回复可见内容
  document.body.querySelectorAll('blockquote').forEach((blockquoteNode) => {
    if (blockquoteNode.querySelector('p>img[alt="^mbbs_reply_visible_tag^"]')) {
      blockquoteNode.innerHTML = '';
    }
  });

  return (document.body.textContent || '')
    .replace(/\^mbbs_after_style\^/g, '') // 索引隐藏 隐藏样式 a 标签
    .trim(); // 去除前后 空格/空行
}

export function markdownToHtml(markdown: string): string {
  if (!markdown) return '';
  try {
    return lute.MarkdownStr('', markdown);
  } catch (e) {
    console.error(e);
    return markdown;
  }
}

export function markdownToPureText(markdown: string): string {
  try {
    return htmlToPureText(markdownToHtml(markdown));
  } catch (e) {
    console.error(e);
    return '';
  }
}

export function markdownHasReplyHiddenContent(markdown: string): boolean {
  return /> !\[\^mbbs_reply_visible_tag\^\]\(.+\)/.test(markdown);
}

export function filterMarkdownHiddenContent(markdown: string): string {
  let inFilter = false;

  const contentLines = [] as string[];
  let filteredLines = [] as string[];
  for (const line of markdown.split('\n')) {
    if (inFilter) {
      if (/^\s*>/.test(line)) {
        // 过滤中
        filteredLines.push(line);
      } else {
        // 过滤结束
        contentLines.push(
          `> （有隐藏内容共 ${markdownToPureText(filteredLines.join('\n')).replace(/[\n\s]/g, '').length} 字，评论后可见）\n`,
        );
        inFilter = false;
        filteredLines = [];
        contentLines.push(line);
      }
    } else {
      if (line.includes('> ![^mbbs_reply_visible_tag^]')) {
        inFilter = true;
        contentLines.push(line);
        // 开启过滤
      } else {
        contentLines.push(line);
      }
    }
  }
  if (filteredLines.length) {
    // 隐藏部分 是 内容最后场景
    contentLines.push(`> （有隐藏内容共 ${markdownToPureText(filteredLines.join('\n')).replace(/[\n\s]/g, '').length} 字，评论后可见）\n`);
  }
  return contentLines.join('\n');
}
