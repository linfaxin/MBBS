import React, { useEffect, useMemo, useState } from 'react';
import { Checkbox, ListItemText, MenuItem, SelectProps, TextField } from '@mui/material';
import { TextFieldProps } from '@mui/material/TextField/TextField';
import { Group } from '@/api/group';

const GroupSelect = (props: {
  label?: string;
  multiple?: boolean;
  value?: number | number[];
  defaultValue?: number | number[];
  onChange?: (value: number | number[]) => void;
  groups: Group[];
  SelectProps?: Partial<SelectProps>;
  TextFieldProps?: Partial<TextFieldProps>;
}) => {
  const { label = '选择角色', groups, multiple, value: _value, defaultValue, onChange, TextFieldProps, SelectProps } = props;

  const [value, setValue] = useState(_value || defaultValue);
  useEffect(() => {
    if (_value) {
      setValue(_value);
    }
  }, [_value]);

  const groupNameMap = useMemo(() => {
    const map = {} as Record<number, string>;
    groups.forEach((c) => (map[c.id] = c.name));
    return map;
  }, [groups]);

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
        renderValue: (v) => Array.isArray(v) && v.map((id) => groupNameMap[id]).join(','),
        sx: {
          fontSize: '14px',
        },
        multiple,
      }}
      value={value}
      onChange={(e) => triggerChange(e.target.value as any)}
    >
      {(groups || []).map((c) => (
        <MenuItem value={c.id} key={c.id}>
          {multiple && Array.isArray(value) && <Checkbox checked={value.indexOf(c.id) > -1} />}
          <ListItemText primary={c.name} />
        </MenuItem>
      ))}
    </TextField>
  );
};

export default GroupSelect;
