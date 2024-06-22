import React, { useRef, useState } from 'react';
import { Thread, ThreadIsApproved } from '@/api/thread';
import showAlert from '@/utils/show-alert';
import { Button, TextField } from '@mui/material';
import OpenPromptDialog from '@/components/open-prompt-dialog';
import { threadApi } from '@/api';

const OpenSetApprovedDialog = (props: { thread: Thread; onThreadChange: (newThread: Thread) => void }) => {
  const { thread, onThreadChange } = props;

  const [inputtingValue, setInputtingValue] = useState(String(thread.is_approved));
  const checkFailReasonRef = useRef('');

  return (
    <OpenPromptDialog
      title="设置审核状态"
      defaultValue={String(thread.is_approved)}
      options={[
        { value: String(ThreadIsApproved.checking), label: '审核中' },
        { value: String(ThreadIsApproved.ok), label: '审核通过' },
        { value: String(ThreadIsApproved.check_failed), label: '审核不通过' },
      ]}
      TextFieldProps={{
        onChange: (e) => {
          setInputtingValue(e.target.value);
        },
      }}
      descriptionBelow={
        inputtingValue === String(ThreadIsApproved.check_failed) && (
          <TextField
            size="small"
            fullWidth
            sx={{ mt: 2 }}
            label="不通过原因(选填)"
            defaultValue={checkFailReasonRef.current}
            autoComplete="off"
            onChange={(e) => (checkFailReasonRef.current = e.target.value)}
          />
        )
      }
      onSubmit={async (inputValue) => {
        try {
          await threadApi.setApproved(thread.id, inputValue, checkFailReasonRef.current);
          thread.is_approved = parseInt(inputValue);
          onThreadChange(thread);
        } catch (e: any) {
          showAlert(e.message);
        }
      }}
    >
      <Button>
        {
          {
            [ThreadIsApproved.checking]: '审核中',
            [ThreadIsApproved.ok]: '审核通过',
            [ThreadIsApproved.check_failed]: '审核不通过',
          }[thread.is_approved]
        }
      </Button>
    </OpenPromptDialog>
  );
};

export default OpenSetApprovedDialog;
