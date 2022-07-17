import React from 'react';
import MarkdownPreview, { MarkdownPreviewProps } from '@/components/vditor/markdown-preview';
import './thread-content-style.less';

const ThreadContentPreview: React.FC<MarkdownPreviewProps> = (props) => {
  return <MarkdownPreview {...props} />;
};

export default ThreadContentPreview;
