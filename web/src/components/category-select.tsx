import React, { useEffect, useMemo, useState } from 'react';
import { Checkbox, ListItemText, MenuItem, SelectProps, TextField } from '@mui/material';
import { Category } from '@/api/category';
import { TextFieldProps } from '@mui/material/TextField/TextField';

const CategorySelect = (props: {
  label?: string;
  multiple?: boolean;
  value?: number | number[];
  defaultValue?: number | number[];
  onChange?: (value: number | number[]) => void;
  categories: Category[];
  SelectProps?: Partial<SelectProps>;
  TextFieldProps?: Partial<TextFieldProps>;
}) => {
  const { label = '选择版块', categories, multiple, value: _value, defaultValue, onChange, TextFieldProps, SelectProps } = props;

  const [value, setValue] = useState(_value || defaultValue);
  useEffect(() => {
    if (_value) {
      setValue(_value);
    }
  }, [_value]);

  const categoryNameMap = useMemo(() => {
    const map = {} as Record<number, string>;
    categories.forEach((c) => (map[c.id] = c.name));
    return map;
  }, [categories]);

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
        renderValue: (v) => Array.isArray(v) && v.map((id) => categoryNameMap[id]).join(','),
        sx: {
          fontSize: '14px',
        },
        multiple,
      }}
      value={value}
      onChange={(e) => triggerChange(e.target.value as any)}
    >
      {(categories || []).map((c) => (
        <MenuItem value={c.id} key={c.id}>
          {multiple && Array.isArray(value) && <Checkbox checked={value.indexOf(c.id) > -1} />}
          <ListItemText primary={c.name} />
        </MenuItem>
      ))}
    </TextField>
  );
};

export default CategorySelect;
