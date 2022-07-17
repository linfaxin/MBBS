import React, { useEffect, useState } from 'react';
import { markdownToPureText } from '@/utils/html-to-pure-text';

const MarkdownPureText: React.FC<{
  md: string;
}> = ({ md }) => {
  const [text, setText] = useState('');

  useEffect(() => {
    markdownToPureText(md).then(setText);
  }, [md]);

  return <>{text}</>;
};

export default MarkdownPureText;
