import React, { useMemo, useState } from 'react';
import { ButtonProps } from '@mui/material';
import { LoadingButton } from '@mui/lab';
import { resourcesApi } from '@/api';
import doTaskWithUI from '@/utils/do-task-with-ui';
import showAlert from '@/utils/show-alert';
import { formatSize } from '@/utils/format-util';

const DefaultMaxFileSize = 2 * 1024 * 1024; // 2M
const uploadResourceBtnPrefix = 'upload_resource_';
let resourceIdNext = 1;

const UploadResourceButton: React.FC<
  ButtonProps & {
    maxSize?: number;
    beforeUpload?: (file: File) => Blob | Promise<Blob>;
    onUploaded?: (result: { filePath: string; file: File }) => void | Promise<void>;
  }
> = (props) => {
  const { maxSize = DefaultMaxFileSize, onUploaded, beforeUpload, ...buttonProps } = props;
  const [uploading, setUploading] = useState(false);
  const resourceId = useMemo(() => `${uploadResourceBtnPrefix}_${resourceIdNext++}`, []);
  return (
    <label htmlFor={resourceId}>
      <input
        accept="image/*"
        id={resourceId}
        type="file"
        style={{ display: 'none' }}
        value={undefined}
        onChange={async (e) => {
          const files = e.target.files;
          if (!files) return;
          let file = files[0];
          e.target.value = ''; // 清空 input 选中的文件
          if (file.size > maxSize) {
            showAlert(`文件大小(${formatSize(file.size)})超过上限(${formatSize(maxSize)})，请重新选择`);
            return;
          }
          setUploading(true);
          try {
            const fileName = file.name;
            let uploadData = file as Blob;
            if (beforeUpload) {
              uploadData = await beforeUpload(file);
            }
            const result = await doTaskWithUI({
              task: () => resourcesApi.upload(uploadData, fileName),
              failAlert: true,
              fullScreenLoading: false,
            });
            if (onUploaded) {
              await onUploaded({
                ...result,
                file,
              });
            }
          } catch (e) {}
          setUploading(false);
        }}
      />
      <LoadingButton
        loading={uploading}
        loadingPosition={buttonProps.startIcon ? 'start' : undefined}
        variant="contained"
        component="span"
        size="small"
        {...buttonProps}
      >
        {props.children}
      </LoadingButton>
    </label>
  );
};

export default UploadResourceButton;
