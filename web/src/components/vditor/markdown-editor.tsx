import React, { ReactNode, useLayoutEffect, useMemo, useRef, useState } from 'react';
import initVditor, { InitVditorOption } from '@/components/vditor/initVditor';
import { Box, CircularProgress, IconButton, useTheme } from '@mui/material';
import { BoxProps } from '@mui/material/Box/Box';
import { resourcesApi } from '@/api';
import { showErrorAlert } from '@/utils/show-alert';
import AlignHorizontalCenterIcon from '@mui/icons-material/AlignHorizontalCenter';
import AlignHorizontalLeftIcon from '@mui/icons-material/AlignHorizontalLeft';
import AlignHorizontalRightIcon from '@mui/icons-material/AlignHorizontalRight';
import FormatColorTextIcon from '@mui/icons-material/FormatColorText';
import LinkIcon from '@mui/icons-material/Link';
import FontDownloadIcon from '@mui/icons-material/FontDownload';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useUpdate } from 'ahooks';
import { compressImageFile } from '@/utils/compress-image-util';
import { useModel } from 'umi';
import { DEFAULT_ATTACHMENT_IMAGE_COMPRESS_SIZE } from '@/consts';
import { showOpenEditLinkDialog } from '@/components/vditor/open-edit-link-dialog';
import { showColorPickerDialog } from '@/components/open-color-picker-dialog';
import { hasParentElementTag } from '@/components/vditor/util';
import MouseOverTip from '@/components/mouse-over-tip';
import { formatSize } from '@/utils/format-util';

let applyNextNodeStyleIdNext = 1;

export declare type MarkdownEditorProps = {
  defaultMarkdown?: string;
  className?: string;
  vditor?: Omit<InitVditorOption, 'doUploadImages'>;
  afterInit?: InitVditorOption['afterInit'];
  canUploadImage?: boolean;
  canUploadFile?: boolean;
  renderActions?: ReactNode | (() => ReactNode);
  onEditingNodeChange?: (node: HTMLElement) => void;
} & BoxProps;

const MarkdownEditor: React.FC<MarkdownEditorProps> = (props) => {
  const {
    defaultMarkdown,
    vditor,
    sx,
    canUploadImage = true,
    canUploadFile = true,
    afterInit,
    onEditingNodeChange,
    renderActions,
    ...otherProps
  } = props;
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const bbsSetting = useModel('useBBSSetting');
  const [currentSelectNode, setCurrentSelectNode] = useState<HTMLElement>();
  const [currentSelectImgNode, setCurrentSelectImgNode] = useState<HTMLImageElement>();
  const ref = useRef<HTMLDivElement>(null);
  const forceUpdate = useUpdate();

  const shouldShowDefaultToolbar: boolean = useMemo(
    () => !!(currentSelectNode && hasParentElementTag(currentSelectNode, 'TABLE')),
    [currentSelectNode],
  );

  const handleEditingNodeChange = (newNode: HTMLElement) => {
    if (currentSelectNode === newNode) return;
    setCurrentSelectNode(newNode);
    if (onEditingNodeChange) {
      onEditingNodeChange(newNode);
    }
  };

  const getFakeStyleElementForStyleAnchorElement = (styleAnchorElement: HTMLAnchorElement): HTMLElement | null => {
    if ((styleAnchorElement as any)['_style_node']) {
      return (styleAnchorElement as any)['_style_node'];
    }
    if (styleAnchorElement.innerText !== '^mbbs_after_style^') {
      return null;
    }

    const cssText = styleAnchorElement.hash.replace(/^#/, '');
    if (cssText == null) {
      return null;
    }
    const fakeStyleNode = document.createElement('span');
    fakeStyleNode.style.cssText = cssText;
    (styleAnchorElement as any)['_style_node'] = fakeStyleNode;
    return fakeStyleNode as HTMLElement;
  };
  const getNodeStyleElement = (willStyledNode: HTMLElement): HTMLElement | null => {
    const htmlBlockEl = willStyledNode.previousElementSibling;
    if (!htmlBlockEl) return null;
    let hasStyleNode = htmlBlockEl.querySelector('[data-next-node-style]') || (htmlBlockEl as any)['_style_node'];
    if (!hasStyleNode && htmlBlockEl.textContent === '^mbbs_after_style^' && htmlBlockEl.tagName === 'A') {
      hasStyleNode = getFakeStyleElementForStyleAnchorElement(htmlBlockEl as HTMLAnchorElement);
    }
    if (!(hasStyleNode instanceof HTMLElement)) return null;
    return hasStyleNode;
  };

  const getOrCreateNodeStyleElement = (willStyledNode: HTMLElement): HTMLElement => {
    let hasStyleNode = getNodeStyleElement(willStyledNode);
    if (!hasStyleNode && willStyledNode instanceof HTMLHeadingElement) {
      // h1, h2, ... 标签使用 html 隐藏块保留样式
      const htmlBlock = document.createElement('div');
      htmlBlock.style.display = 'none';
      htmlBlock.setAttribute('class', 'vditor-wysiwyg__block');
      htmlBlock.setAttribute('data-type', 'html-block');
      htmlBlock.setAttribute('data-block', '0');
      htmlBlock.innerHTML = `
<pre style="display: none"><code>&lt;p data-next-node-style&gt;&lt;/p&gt;</code></pre>
<pre class="vditor-wysiwyg__preview" data-render="1"><p data-next-node-style></p></pre>
`;
      hasStyleNode = htmlBlock.querySelector('[data-next-node-style]') as HTMLElement;
      if (willStyledNode.parentElement) {
        willStyledNode.parentElement.insertBefore(htmlBlock, willStyledNode);
      }
    }
    if (!hasStyleNode) {
      // 其他行内块使用 code 隐藏块 保留样式
      const styleAnchorElement = document.createElement('a');
      styleAnchorElement.style.display = 'none';
      styleAnchorElement.href = '#';
      styleAnchorElement.innerText = '^mbbs_after_style^';

      hasStyleNode = getFakeStyleElementForStyleAnchorElement(styleAnchorElement) as HTMLElement;

      if (willStyledNode.parentElement) {
        willStyledNode.parentElement.insertBefore(styleAnchorElement, willStyledNode);
      }
    }
    return hasStyleNode;
  };

  const applyNextNodeStyle = () => {
    const rootContainer = ref.current;
    if (!rootContainer) return;

    // 针对 h1,h2,... 用基于 html-block 块的格式 使样式生效
    rootContainer.querySelectorAll('[data-next-node-style]').forEach((node) => {
      if (!(node instanceof HTMLElement)) return;
      const htmlBlockEl = node.parentElement?.parentElement;
      if (!htmlBlockEl) return;
      if (htmlBlockEl.getAttribute('data-type') !== 'html-block') return;
      htmlBlockEl.style.display = 'none';

      // 当前最新样式设置入 code 节点内，提交时可取到值
      const codeEl = htmlBlockEl.querySelector('code');
      if (codeEl) codeEl.innerText = node.outerHTML;

      // 创建 style 标签使得相邻下个节点样式生效
      let applyNextNodeStyleId = htmlBlockEl.getAttribute('data-apply-style-id');
      if (!applyNextNodeStyleId) {
        applyNextNodeStyleId = String(applyNextNodeStyleIdNext++);
        htmlBlockEl.setAttribute('data-apply-style-id', applyNextNodeStyleId);
      }
      let applyStyleNode = rootContainer.querySelector(`style[data-apply-id="${applyNextNodeStyleId}"]`);
      if (!applyStyleNode) {
        applyStyleNode = document.createElement('style');
        applyStyleNode.setAttribute('data-apply-id', applyNextNodeStyleId);
        rootContainer.appendChild(applyStyleNode);
      }
      applyStyleNode.innerHTML = `[data-apply-style-id="${applyNextNodeStyleId}"] + * {${node.style.cssText}}`;
    });

    // 针对行内代码块，用基于隐藏样式 a 标签 使样式生效
    rootContainer.querySelectorAll('a').forEach((anchorEle) => {
      if (!(anchorEle instanceof HTMLElement)) return;
      const fakeStyleElement = getFakeStyleElementForStyleAnchorElement(anchorEle);

      if (!fakeStyleElement) return;

      anchorEle.style.display = 'none';

      // 当前最新样式设置入 code 节点内，提交时可取到值
      anchorEle.setAttribute('href', `#${fakeStyleElement.style.cssText.replace(/\s/g, '')}`);

      const nextEl = anchorEle.nextElementSibling;
      if (nextEl instanceof HTMLElement) {
        nextEl.style.cssText = fakeStyleElement.style.cssText;
      }
    });
  };

  useLayoutEffect(() => {
    if (!ref.current) return;
    initVditor(ref.current, {
      ...vditor,
      defaultValue: defaultMarkdown,
      afterInit: (v) => {
        if (afterInit) afterInit(v);
        if (vditor?.afterInit) vditor?.afterInit(v);
      },
      onRenderFinish: () => {
        applyNextNodeStyle();
      },
      theme: theme.palette.mode,
      doUploadImages: canUploadImage
        ? async (files) => {
            if (!files || !files.length) return [];
            setLoading(true);
            try {
              return await Promise.all(
                files.map(async (f) => {
                  const maxSize = parseInt(bbsSetting.attachment_image_compress_size) || DEFAULT_ATTACHMENT_IMAGE_COMPRESS_SIZE;
                  const noNeedCompressFileSize = maxSize * 100; // 免压缩文件大小
                  const blob =
                    f.size && f.size < noNeedCompressFileSize ? f : await compressImageFile(f, { maxWidth: maxSize, maxHeight: maxSize });
                  const { filePath } = await resourcesApi.upload(blob, f.name);
                  return { url: filePath, file: f };
                }),
              );
            } catch (e: any) {
              console.warn(e);
              showErrorAlert(e.message);
            } finally {
              setLoading(false);
            }
          }
        : undefined,
      doUploadFiles: canUploadFile
        ? async (files) => {
            if (!files || !files.length) return [];
            setLoading(true);
            try {
              return await Promise.all(
                files.map(async (f) => {
                  if (f.size >= parseInt(bbsSetting.attachment_size_limit)) {
                    throw new Error(
                      `文件太大，超过站点上限(${formatSize(
                        parseInt(bbsSetting.attachment_size_limit),
                      )})。如果是视频文件，请压缩/裁剪后再上传`,
                    );
                  }
                  const { filePath } = await resourcesApi.upload(f, `attachment/${f.name}`);
                  return { url: filePath, file: f };
                }),
              );
            } catch (e: any) {
              console.warn(e);
              showErrorAlert(e.message);
            } finally {
              setLoading(false);
            }
          }
        : undefined,
      onClickInsertLink: () => {
        return new Promise<{ text: string; link: string }>((resolve) => {
          showOpenEditLinkDialog({
            title: '插入链接',
            onOk: (result) => {
              resolve(result);
            },
          });
        });
      },
    });
    // 轮训检查当前光标所在元素
    const intervalId = setInterval(() => {
      try {
        const selectNode = getSelection()?.getRangeAt(0)?.startContainer;
        if (!selectNode) return;
        const selectElement = selectNode instanceof HTMLElement ? selectNode : selectNode.parentElement;
        if (!selectElement) return;
        handleEditingNodeChange(selectElement);
      } catch (e) {}
    }, 500);
    return () => clearInterval(intervalId);
  }, []);

  return (
    <Box {...otherProps} display="flex" sx={{ ...sx, position: 'relative' }}>
      <div
        style={{ flex: 1 }}
        data-show-toolbar={shouldShowDefaultToolbar}
        ref={ref}
        onClickCapture={(e) => {
          const target = e.target;
          if (target instanceof HTMLAnchorElement) {
            // 编辑时 不允许点击链接跳转
            e.preventDefault();
            e.stopPropagation();
          }
          if (ref.current) {
            ref.current.querySelectorAll('img[data-select-img]').forEach((img) => img.removeAttribute('data-select-img'));
          }
          if (target instanceof HTMLImageElement) {
            target.setAttribute('data-select-img', '');
            setCurrentSelectImgNode(target);
          } else {
            setCurrentSelectImgNode(undefined);
          }
        }}
      />
      {loading && (
        <Box
          sx={{
            position: 'absolute',
            left: 0,
            top: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            zIndex: 9,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <CircularProgress />
        </Box>
      )}
      <Box
        sx={{
          position: 'absolute',
          right: 12,
          bottom: 12,
          zIndex: 1,
        }}
      >
        {currentSelectNode instanceof HTMLAnchorElement && (
          <MouseOverTip tip="设置链接">
            <IconButton
              size="small"
              sx={{ background: theme.palette.grey['200'], color: theme.palette.grey['700'], boxShadow: theme.shadows[5], mr: 1 }}
              onClick={() =>
                showOpenEditLinkDialog({
                  title: '设置链接',
                  defaultValue: {
                    text: currentSelectNode.innerText,
                    link: currentSelectNode?.getAttribute('href') || '',
                  },
                  onOk: ({ text, link }) => {
                    currentSelectNode.innerText = text;
                    currentSelectNode.setAttribute('href', link);
                  },
                })
              }
            >
              <LinkIcon />
            </IconButton>
          </MouseOverTip>
        )}
        {currentSelectNode instanceof HTMLHeadingElement && (
          <MouseOverTip tip="内容对齐">
            <IconButton
              size="small"
              sx={{ background: theme.palette.grey['200'], color: theme.palette.grey['700'], boxShadow: theme.shadows[5], mr: 1 }}
              onClick={() => {
                const nextAlignMap = { left: 'center', center: 'right', right: '' } as Record<string, string>;
                const nodeStyleElement = getOrCreateNodeStyleElement(currentSelectNode);
                nodeStyleElement.style.textAlign = nextAlignMap[nodeStyleElement.style.textAlign || 'left'] || '';
                applyNextNodeStyle();
                forceUpdate();
              }}
            >
              {
                {
                  left: <AlignHorizontalLeftIcon />,
                  center: <AlignHorizontalCenterIcon />,
                  right: <AlignHorizontalRightIcon />,
                }[getNodeStyleElement(currentSelectNode)?.style.textAlign || 'left']
              }
            </IconButton>
          </MouseOverTip>
        )}
        {(currentSelectNode instanceof HTMLHeadingElement || currentSelectNode?.tagName === 'CODE') && (
          <MouseOverTip tip="字体颜色">
            <IconButton
              size="small"
              sx={{ background: theme.palette.grey['200'], color: theme.palette.grey['700'], boxShadow: theme.shadows[5], mr: 1 }}
              onClick={() => {
                const nodeStyleElement = getOrCreateNodeStyleElement(currentSelectNode);
                showColorPickerDialog({
                  title: '字体颜色',
                  alpha: true,
                  defaultColor: getComputedStyle(nodeStyleElement).color || nodeStyleElement.style.color || theme.palette.text.primary,
                  onSubmit: (color) => {
                    nodeStyleElement.style.color = color || '';
                    applyNextNodeStyle();
                  },
                });
              }}
            >
              <FormatColorTextIcon />
            </IconButton>
          </MouseOverTip>
        )}
        {(currentSelectNode instanceof HTMLHeadingElement || currentSelectNode?.tagName === 'CODE') && (
          <MouseOverTip tip="背景颜色">
            <IconButton
              size="small"
              sx={{ background: theme.palette.grey['200'], color: theme.palette.grey['700'], boxShadow: theme.shadows[5], mr: 1 }}
              onClick={() => {
                const nodeStyleElement = getOrCreateNodeStyleElement(currentSelectNode);
                showColorPickerDialog({
                  title: '背景颜色',
                  alpha: true,
                  defaultColor: nodeStyleElement.style.backgroundColor || 'rgba(255, 255, 255, 1)',
                  onSubmit: (color) => {
                    nodeStyleElement.style.backgroundColor = color || '';
                    applyNextNodeStyle();
                  },
                });
              }}
            >
              <FontDownloadIcon />
            </IconButton>
          </MouseOverTip>
        )}
        {currentSelectImgNode && (
          <MouseOverTip tip="删除图片">
            <IconButton
              size="small"
              sx={{ background: theme.palette.grey['200'], color: theme.palette.grey['700'], boxShadow: theme.shadows[5], mr: 1 }}
              onClick={() => {
                currentSelectImgNode.remove?.();
                setCurrentSelectImgNode(undefined);
              }}
            >
              <DeleteOutlineIcon />
            </IconButton>
          </MouseOverTip>
        )}
        {typeof renderActions === 'function' ? renderActions() : renderActions}
      </Box>
    </Box>
  );
};

export default MarkdownEditor;
