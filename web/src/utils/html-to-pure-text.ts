import Vditor from 'vditor';
import { vditorCDNUrlPrefix } from '@/components/vditor/util';

const template = document.createElement('template');

export default function htmlToPureText(html: string): string {
  template.innerHTML = html;
  return template.content.textContent || '';
}

export async function markdownToPureText(markdown: string): Promise<string> {
  const html = await Vditor.md2html(markdown, {
    cdn: vditorCDNUrlPrefix,
    mode: 'dark',
  });
  return htmlToPureText(html);
}
