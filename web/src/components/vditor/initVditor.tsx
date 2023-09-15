import React from 'react';
import Vditor from 'vditor';
import 'vditor/dist/index.css';
import './vditor-reset.less';
import transformWillRenderHtml, { transformRenderHtmlForUpload } from '@/components/vditor/transform-will-render-html';
import { vditorCDNEmojiPathPrefix, vditorCDNThemePathPrefix, vditorCDNUrlPrefix } from '@/components/vditor/util';

export interface InitVditorOption {
  count?: number;
  defaultValue?: string;
  afterInit?: (vditor: Vditor) => void | any;
  theme?: 'dark' | 'light';
  placeholder?: string;
  doUploadImages?: (files: File[]) => Promise<undefined | Array<{ file: File; url: string }>>;
  doUploadFiles?: (files: File[]) => Promise<undefined | Array<{ file: File; url: string }>>;
  onClickInsertLink?: () => Promise<{ text: string; link: string }>;
  onRenderFinish?: () => void;
}

let uploadImgOrFileIdNext = 1;

const eventStopPropagation = (e: Event) => {
  e.stopPropagation();
};

export default function initVditor(div: HTMLElement, param: InitVditorOption) {
  if (!div) return;
  const {
    count,
    defaultValue,
    afterInit = () => {},
    placeholder = '请输入内容',
    doUploadImages,
    doUploadFiles,
    onClickInsertLink,
    onRenderFinish,
  } = param;

  const uploadImgName = `vditor-upload-image-input-${uploadImgOrFileIdNext++}`;
  const uploadFileName = `vditor-upload-file-input-${uploadImgOrFileIdNext++}`;
  const vditor = new Vditor(div, {
    cdn: vditorCDNUrlPrefix,
    mode: 'wysiwyg',
    theme: param.theme === 'dark' ? 'dark' : undefined,
    placeholder,
    // value: defaultValue, // 注释说明：使用 vditor.setValue 设置初始化，确保 html 渲染拦截生效
    preview: {
      transform: transformWillRenderHtml,
      theme: {
        current: param.theme === 'dark' ? 'dark' : 'light',
        path: vditorCDNThemePathPrefix,
      },
    },
    toolbar: [
      'headings',
      {
        name: 'quote',
        icon: `<svg style='border-left: 2px solid currentColor' viewBox='0 0 1024 1024' xmlns='http://www.w3.org/2000/svg' width='64' height='64'>
  <path d='M747.52 750.933333H276.48l-68.266667 145.066667c-13.653333 29.013333-49.493333 42.666667-80.213333 29.013333-29.013333-13.653333-42.666667-49.493333-29.013333-78.506666l331.093333-699.733334c20.48-44.373333 75.093333-63.146667 119.466667-42.666666 18.773333 8.533333 34.133333 23.893333 42.666666 42.666666l331.093334 699.733334c13.653333 29.013333 1.706667 64.853333-29.013334 78.506666-29.013333 13.653333-64.853333 1.706667-80.213333-29.013333L747.52 750.933333z m-56.32-117.76l-151.893333-322.56c-6.826667-15.36-25.6-20.48-39.253334-13.653333-6.826667 3.413333-11.946667 8.533333-13.653333 13.653333l-151.893333 322.56h356.693333z' />
</svg>`,
      },
      'line',
      'list',
      'check',
      doUploadImages
        ? {
            hotkey: '',
            name: 'picture',
            tipPosition: 'ne',
            tip: '插入图片',
            className: 'right',
            icon: `<input name='${uploadImgName}' type='file' accept='image/*'>
<svg viewBox='0 0 1137 1024' xmlns='http://www.w3.org/2000/svg' width='142.1' height='128' style="pointer-events: none">
  <path d='M913 1024H225C102 1024 0 932 0 822V202C0 92 102 0 225 0h688c123 0 225 92 225 202v620c0 110-102 202-225 202zM225 81c-75 0-135 54-135 121v620c0 67 60 121 135 121h688c75 0 135-54 135-121V202c0-67-60-121-135-121H225z'/>
  <path d='M762 1024L364 604 63 911 0 852l312-318a73 73 0 01100-3l3 3 407 431-60 59z'/>
  <path d='M1071 704L820 467a2764 2764 0 01-251 220c-21 11-42-8-63-57l260-226c30-27 78-27 106 0l266 247-67 53zM316 288c0 34 18 66 47 83a94 94 0 0095 0 96 96 0 000-166 94 94 0 00-95 0 96 96 0 00-47 83z'/>
</svg>`,
            click: () => {
              // 已在 input 的 onchange 事件处理
            },
          }
        : '',
      'br',
      'emoji',
      'bold',
      'italic',
      'strike',
      {
        hotkey: '',
        name: 'inline-code',
        tip: '关键字样式',
        className: 'right',
        icon: `<svg style='background: ${
          param.theme === 'dark' ? '#555' : '#ddd'
        }; padding: 1px; margin-left: -1px; margin-top: -1px;' viewBox='0 0 1024 1024' xmlns='http://www.w3.org/2000/svg' width='64' height='64'>
  <path d='M747.52 750.933333H276.48l-68.266667 145.066667c-13.653333 29.013333-49.493333 42.666667-80.213333 29.013333-29.013333-13.653333-42.666667-49.493333-29.013333-78.506666l331.093333-699.733334c20.48-44.373333 75.093333-63.146667 119.466667-42.666666 18.773333 8.533333 34.133333 23.893333 42.666666 42.666666l331.093334 699.733334c13.653333 29.013333 1.706667 64.853333-29.013334 78.506666-29.013333 13.653333-64.853333 1.706667-80.213333-29.013333L747.52 750.933333z m-56.32-117.76l-151.893333-322.56c-6.826667-15.36-25.6-20.48-39.253334-13.653333-6.826667 3.413333-11.946667 8.533333-13.653333 13.653333l-151.893333 322.56h356.693333z' />
</svg>`,
      },
      {
        name: 'custom-link',
        className: 'right',
        tip: '插入链接',
        icon: `<svg viewBox="0 0 32 32">
<path d="M18.583 22.391a.333.333 0 0 0-.47 0l-4.841 4.841c-2.242 2.242-6.025 2.479-8.5 0-2.479-2.479-2.242-6.258 0-8.5l4.841-4.841a.335.335 0 0 0 0-.471l-1.658-1.658a.333.333 0 0 0-.47 0l-4.841 4.841c-3.525 3.525-3.525 9.229 0 12.75s9.229 3.525 12.75 0l4.841-4.841a.335.335 0 0 0 0-.471l-1.65-1.65zM29.358 2.642a9.008 9.008 0 0 0-12.75 0l-4.846 4.841a.333.333 0 0 0 0 .47l1.654 1.654a.335.335 0 0 0 .471 0l4.842-4.841c2.242-2.242 6.025-2.479 8.5 0 2.479 2.479 2.242 6.258 0 8.5l-4.841 4.841a.333.333 0 0 0 0 .47l1.658 1.658a.335.335 0 0 0 .471 0l4.841-4.841a9.02 9.02 0 0 0 0-12.754zm-9.271 7.537a.333.333 0 0 0-.47 0l-9.437 9.433a.333.333 0 0 0 0 .47l1.65 1.65a.335.335 0 0 0 .471 0l9.433-9.433a.335.335 0 0 0 0-.471l-1.646-1.65z"/>
</svg>`,
        click: async () => {
          if (!onClickInsertLink) return;
          const linkResult = await onClickInsertLink();
          vditor.insertValue(`[${linkResult?.text || '链接'}](${linkResult?.link || ''})`);
        },
      },
      doUploadFiles
        ? {
            hotkey: '',
            name: 'files',
            tipPosition: 'ne',
            tip: '插入视频/附件',
            className: 'right',
            icon: `<input name='${uploadFileName}' type='file'>
<svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" width="28" height="28" style="pointer-events: none">
  <path d="M890.5 250.5l-213-213C653.5 13.5 620.9 0 587 0H160c-35.3 0-64 28.6-64 64v896c0 35.3 28.7 64 64 64h704c35.3 0 64-28.7 64-64V341c0-33.9-13.5-66.5-37.5-90.5zM640 90.5L837.5 288H704c-35.3 0-64-28.7-64-64V90.5zM353 502.9c0-24.5 26.5-39.9 47.8-27.8l270.1 153.1c21.6 12.3 21.6 43.4 0 55.7l-270.1 153c-21.3 12.1-47.8-3.3-47.8-27.8V502.9z"/>
  <path d="M565.6 669.9l-124.8 70.7c-10.7 6-23.9-1.7-23.9-13.9V585.3c0-12.3 13.2-20 23.9-13.9l124.8 70.7c10.9 6.1 10.9 21.7 0 27.8z"/>
</svg>`,
            click: () => {
              // 已在 input 的 onchange 事件处理
            },
          }
        : '',
      {
        name: 'undo',
        icon: `<svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" width="28" height="28"><path d="M422.4 938.667c-12.8 0-21.333-4.267-29.867-12.8l-358.4-392.534c-17.066-17.066-12.8-42.666 0-59.733l358.4-375.467c8.534-12.8 25.6-17.066 42.667-8.533s25.6 21.333 25.6 38.4v187.733c136.533 8.534 256 64 354.133 166.4C921.6 588.8 985.6 725.333 1002.667 887.467c0 17.066-8.534 38.4-25.6 42.666-17.067 8.534-38.4 4.267-51.2-12.8C827.733 797.867 733.867 721.067 652.8 704c-64-17.067-123.733-21.333-192-12.8V896c0 17.067-12.8 34.133-25.6 38.4-4.267 4.267-8.533 4.267-12.8 4.267zm-298.667-435.2l256 281.6V652.8c0-21.333 17.067-38.4 34.134-42.667 93.866-17.066 174.933-12.8 260.266 8.534 64 17.066 136.534 59.733 209.067 128-25.6-76.8-72.533-149.334-128-204.8-93.867-93.867-204.8-140.8-337.067-140.8-21.333 0-42.666-21.334-42.666-42.667V234.667l-251.734 268.8z"/></svg>`,
      },
    ].filter(Boolean),
    cache: {
      enable: false,
    },
    counter: {
      enable: true,
      max: count,
    },
    hint: {
      emoji: require('./vditor_emoji_map.json'),
      emojiPath: vditorCDNEmojiPathPrefix,
    },
    after: () => {
      // html 渲染拦截
      const originMd2VditorDOM = vditor.vditor.lute.Md2VditorDOM;
      vditor.vditor.lute.Md2VditorDOM = function (input: string) {
        const vhtml = originMd2VditorDOM.call(this, input);
        return transformWillRenderHtml(vhtml);
      };
      // html 渲染拦截
      const originSpinVditorDOM = vditor.vditor.lute.SpinVditorDOM;
      vditor.vditor.lute.SpinVditorDOM = function (input: string) {
        const vhtml = originSpinVditorDOM.call(this, input);
        return transformWillRenderHtml(vhtml);
      };
      // 获取 MD 内容拦截
      const originVditorDOM2Md = vditor.vditor.lute.VditorDOM2Md;
      vditor.vditor.lute.VditorDOM2Md = function (vhtml: string) {
        return originVditorDOM2Md.call(this, transformRenderHtmlForUpload(vhtml));
      };

      if (defaultValue) {
        vditor.setValue(defaultValue, true);
      }

      // 上传图片 input 监听
      let doUploadAndInsertImage: (files: File[]) => Promise<void>;
      if (doUploadImages) {
        const uploadImgInput = vditor.vditor.toolbar?.element?.querySelector(`[name=${uploadImgName}]`) as HTMLInputElement;
        uploadImgInput.addEventListener('click', eventStopPropagation, true);
        uploadImgInput.addEventListener('touchstart', eventStopPropagation, true);

        doUploadAndInsertImage = async (files: File[]) => {
          const selection = window.getSelection();
          let currentRange: Range | null = null;
          try {
            currentRange = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
          } catch (e) {}

          const result = await doUploadImages(files);

          if (result && result.length) {
            if (currentRange && selection) {
              selection.removeAllRanges();
              selection.addRange(currentRange);
            }
            vditor.insertValue(result.map((image) => `![img](${image.url})`).join('\n\n'));
          }
        };

        uploadImgInput.onchange = () => {
          const files = Array.from(uploadImgInput.files || []);
          uploadImgInput.value = ''; // 清空 input 选中的文件
          doUploadAndInsertImage(files);
        };
      }

      let doUploadAndInsertFiles: (files: File[]) => Promise<void>;
      if (doUploadFiles) {
        const uploadFileInput = vditor.vditor.toolbar?.element?.querySelector(`[name=${uploadFileName}]`) as HTMLInputElement;
        uploadFileInput.addEventListener('click', eventStopPropagation, true);
        uploadFileInput.addEventListener('touchstart', eventStopPropagation, true);

        doUploadAndInsertFiles = async (files: File[]) => {
          const selection = window.getSelection();
          let currentRange: Range | null = null;
          try {
            currentRange = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
          } catch (e) {}

          const result = await doUploadFiles(files);

          if (result && result.length) {
            if (currentRange && selection) {
              selection.removeAllRanges();
              selection.addRange(currentRange);
            }
            vditor.insertValue(result.map((f) => `[${f.file.name.replace(/]/g, '】')}](${f.url})`).join('\n\n'));
          }
        };

        uploadFileInput.onchange = () => {
          const files = Array.from(uploadFileInput.files || []);
          uploadFileInput.value = ''; // 清空 input 选中的文件
          doUploadAndInsertFiles(files);
        };
      }

      // 支持粘贴图片
      vditor.vditor.wysiwyg?.element.addEventListener(
        'paste',
        (e) => {
          if (e.clipboardData?.items?.length) {
            const imgFiles: File[] = [];
            const attachmentFiles: File[] = [];

            Array.from(e.clipboardData.items).forEach((i) => {
              const file = i.getAsFile();
              if (!file) return;
              if (/^image\//.test(i.type)) {
                imgFiles.push(file);
              } else {
                attachmentFiles.push(file);
              }
            });

            if (imgFiles.length && doUploadAndInsertImage) {
              e.stopPropagation();
              e.preventDefault();
              doUploadAndInsertImage(imgFiles as File[]);
            }
            if (attachmentFiles.length && doUploadAndInsertFiles) {
              e.stopPropagation();
              e.preventDefault();
              doUploadAndInsertFiles(attachmentFiles as File[]);
            }
          }
        },
        true,
      );

      // 支持拖拽入图片/附件
      vditor.vditor.wysiwyg?.element.addEventListener('drop', (e) => {
        if (e.dataTransfer?.items?.length) {
          const imgFiles: File[] = [];
          const attachmentFiles: File[] = [];

          Array.from(e.dataTransfer.items).forEach((i) => {
            const file = i.getAsFile();
            if (!file) return;
            if (/^image\//.test(i.type)) {
              imgFiles.push(file);
            } else {
              attachmentFiles.push(file);
            }
          });

          if (imgFiles.length && doUploadAndInsertImage) {
            e.stopPropagation();
            e.preventDefault();
            doUploadAndInsertImage(imgFiles as File[]);
          }
          if (attachmentFiles.length && doUploadAndInsertFiles) {
            e.stopPropagation();
            e.preventDefault();
            doUploadAndInsertFiles(attachmentFiles as File[]);
          }
        }
      });

      if (vditor.vditor.wysiwyg) {
        let afterRenderTimeoutId: number;
        Object.defineProperty(vditor.vditor.wysiwyg, 'afterRenderTimeoutId', {
          get(): any {
            return afterRenderTimeoutId;
          },
          set(v: any) {
            afterRenderTimeoutId = v;
            onRenderFinish?.();
          },
        });
      }

      onRenderFinish?.();
      afterInit(vditor);
    },
  });

  return vditor;
}
