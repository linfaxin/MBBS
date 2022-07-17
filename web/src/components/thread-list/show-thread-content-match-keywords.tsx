import React from 'react';
import { Thread } from '@/api/thread';
import { Box } from '@mui/material';

// 搜索且匹配中内容时，列表直接显示内容
const ShowThreadContentMatchKeywords = (props: { thread: Thread; keywords: string }) => {
  const { thread, keywords } = props;
  let threadContentPureText = thread.content_for_indexes || '';
  if (threadContentPureText.startsWith(thread.title)) {
    threadContentPureText = threadContentPureText.substring(thread.title.length);
  }

  const matchIndex = threadContentPureText.indexOf(keywords);
  if (matchIndex === -1) return null;

  return (
    <Box sx={{ fontSize: 12, overflow: 'hidden', color: 'grey.500', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
      ...
      {threadContentPureText.substring(Math.max(0, matchIndex - 15), matchIndex)}
      <span style={{ color: '#f73131' }}>{keywords}</span>
      {threadContentPureText.substr(matchIndex + keywords.length, 15)}
      ...
    </Box>
  );
};

export default ShowThreadContentMatchKeywords;
