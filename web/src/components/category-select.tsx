import React, { useEffect, useMemo, useState } from 'react';
import { Checkbox, IconButton, ListItemText, MenuItem, SelectProps, TextField } from '@mui/material';
import { CategoryLinked, getCategoryFullName } from '@/api/category';
import { TextFieldProps } from '@mui/material/TextField/TextField';
import CancelIcon from '@mui/icons-material/Cancel';

const CategorySelect = (props: {
  label?: string;
  multiple?: boolean;
  value?: number | number[];
  defaultValue?: number | number[];
  onChange?: (value: number | number[] | undefined) => void;
  clearable?: boolean;
  categories: CategoryLinked[];
  SelectProps?: Partial<SelectProps>;
  TextFieldProps?: Partial<TextFieldProps>;
}) => {
  const { label = '选择版块', categories, multiple, value: _value, defaultValue, onChange, clearable, TextFieldProps, SelectProps } = props;

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

  const triggerChange = (v: number | number[] | undefined) => {
    setValue(v);
    onChange?.(v);
  };

  return (
    <TextField
      key={value == null ? 'fix_render_error_after_clear' : undefined}
      {...TextFieldProps}
      select
      label={label}
      size="small"
      SelectProps={{
        ...SelectProps,
        renderValue: multiple
          ? (v) =>
              []
                .concat(v as any)
                .map((id) => categoryNameMap[id])
                .join(',')
          : undefined,
        multiple,
      }}
      value={value}
      onChange={(e) => triggerChange(e.target.value as any)}
      InputProps={{
        ...TextFieldProps?.InputProps,
        endAdornment:
          (Array.isArray(value) ? value.length > 0 : value) && clearable ? (
            <IconButton
              size="small"
              sx={{ mr: 2 }}
              onClick={(e) => {
                e.stopPropagation();
                triggerChange(multiple ? [] : undefined);
              }}
            >
              <CancelIcon sx={{ fontSize: '16px' }} />
            </IconButton>
          ) : null,
      }}
    >
      {(categories || []).map((c) => (
        <MenuItem value={c.id} key={c.id}>
          {multiple && Array.isArray(value) && <Checkbox checked={value.indexOf(c.id) > -1} />}
          <ListItemText primary={getCategoryFullName(c)} sx={{ mt: 0, mb: 0 }} />
        </MenuItem>
      ))}
    </TextField>
  );
};

export default CategorySelect;
