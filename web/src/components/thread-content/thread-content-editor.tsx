import React, { useEffect, useRef, useState } from 'react';
import MarkdownEditorSubmit, { MarkdownEditorSubmitProps } from '@/components/vditor/markdown-editor-submit';
import { permissionApi } from '@/api';
import { IconButton, useTheme } from '@mui/material';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import showPromptDialog from '@/utils/show-prompt-dialog';
import Vditor from 'vditor';
import MouseOverTip from '@/components/mouse-over-tip';
import './thread-content-style.less';

const ThreadContentEditor: React.FC<
  MarkdownEditorSubmitProps & {
    categoryId: number;
  }
> = (props) => {
  const { categoryId, ...otherProps } = props;
  const theme = useTheme();
  const vditorRef = useRef<Vditor>();

  const [hasHideContentPermission, setHasHideContentPermission] = useState(false);
  const [blockquoteNode, setBlockquoteNode] = useState<HTMLElement>();

  useEffect(() => {
    permissionApi.getMyPermissions().then((permissions) => {
      const hasPermission =
        permissions.includes('thread.createHiddenContent') || permissions.includes(`category${categoryId}.thread.createHiddenContent`);
      setHasHideContentPermission(hasPermission);
    });
  }, [categoryId]);

  return (
    <MarkdownEditorSubmit
      {...otherProps}
      vditor={{
        ...otherProps.vditor,
        afterInit: (vditor) => {
          vditorRef.current = vditor;
          if (otherProps.vditor?.afterInit) {
            otherProps.vditor.afterInit(vditor);
          }
        },
      }}
      onEditingNodeChange={(node) => {
        let checkNode: HTMLElement | null = node;
        let lastFoundNode: HTMLElement | undefined;
        while (checkNode !== null && checkNode !== vditorRef.current?.vditor.element) {
          if (checkNode.tagName === 'BLOCKQUOTE') {
            lastFoundNode = checkNode;
          }
          checkNode = checkNode.parentElement;
        }
        setBlockquoteNode(lastFoundNode);
      }}
      renderActions={() => {
        if (!hasHideContentPermission) return null;
        if (!blockquoteNode) return null;
        return (
          <MouseOverTip tip="设置引用块可见性">
            <IconButton
              size="small"
              sx={{ background: theme.palette.grey['200'], color: theme.palette.grey['700'], boxShadow: theme.shadows[5], mr: 1 }}
              onClick={() => {
                let contentHiddenMarkTag = blockquoteNode.querySelector('p>img[alt="^mbbs_reply_visible_tag^"]')
                  ?.parentElement as HTMLElement;
                if (!contentHiddenMarkTag) {
                  const img = document.createElement('img');
                  img.alt = '^mbbs_reply_visible_tag^';
                  img.src = '/images/image-reply-visible-tag.png';

                  contentHiddenMarkTag = document.createElement('p');
                  contentHiddenMarkTag.setAttribute('data-block', '0');
                  contentHiddenMarkTag.appendChild(img);
                }
                showPromptDialog({
                  title: '设置引用块可见性',
                  options: [
                    { label: '默认可见', value: 'visible' },
                    { label: '评论后可见', value: 'reply-visible' },
                  ],
                  defaultValue: contentHiddenMarkTag.parentElement ? 'reply-visible' : 'visible',
                  submitFailAlert: true,
                  onSubmit: async (value) => {
                    if (contentHiddenMarkTag.parentElement) {
                      contentHiddenMarkTag.remove();
                    }
                    if ('reply-visible' === value) {
                      blockquoteNode.insertBefore(contentHiddenMarkTag, blockquoteNode.firstElementChild);
                    }
                  },
                });
              }}
            >
              <VisibilityOffIcon />
            </IconButton>
          </MouseOverTip>
        );
      }}
    />
  );
};

export default ThreadContentEditor;
