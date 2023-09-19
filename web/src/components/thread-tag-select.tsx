import React, { useEffect, useMemo, useState } from 'react';
import { Checkbox, Chip, ListItemText, MenuItem, SelectProps, TextField } from '@mui/material';
import { TextFieldProps } from '@mui/material/TextField/TextField';
import { ThreadTag } from '@/api/thread-tag';
import { getResourceUrl } from '@/utils/resource-url';

const ThreadTagSelect = (props: {
  label?: string;
  multiple?: boolean;
  value?: number | number[];
  defaultValue?: number | number[];
  onChange?: (value: number | number[]) => void;
  threadTags: ThreadTag[];
  SelectProps?: Partial<SelectProps>;
  TextFieldProps?: Partial<TextFieldProps>;
}) => {
  const { label = '选择标签', threadTags, multiple, value: _value, defaultValue, onChange, TextFieldProps, SelectProps } = props;

  const [value, setValue] = useState(_value || defaultValue);
  useEffect(() => {
    if (_value) {
      setValue(_value);
    }
  }, [_value]);

  const nameMap = useMemo(() => {
    const map = {} as Record<number, string>;
    threadTags.forEach((c) => (map[c.id] = c.name));
    return map;
  }, [threadTags]);

  const triggerChange = (v: number | number[]) => {
    setValue(v);
    onChange?.(v);
  };

  return (
    <TextField
      {...TextFieldProps}
      select
      label={label}
      size="small"
      SelectProps={{
        ...SelectProps,
        renderValue: (v) => Array.isArray(v) && v.map((id) => nameMap[id]).join(','),
        sx: {
          fontSize: '14px',
        },
        multiple,
      }}
      value={value}
      onChange={(e) => triggerChange(e.target.value as any)}
    >
      {(threadTags || []).map((item) => (
        <MenuItem value={item.id} key={item.id}>
          {multiple && Array.isArray(value) && <Checkbox checked={value.indexOf(item.id) > -1} />}
          <ListItemText
            secondary={
              <>
                <Chip size="small" component="span" label={item.name} sx={{ mr: 0.5 }} />
                {!!item.icon && (
                  <img alt="icon" src={getResourceUrl(item.icon)} style={{ height: 20, paddingRight: 4, verticalAlign: 'text-bottom' }} />
                )}
                {item.description}
              </>
            }
          />
        </MenuItem>
      ))}
    </TextField>
  );
};

export default ThreadTagSelect;
