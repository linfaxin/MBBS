import React, { useEffect, useMemo, useState } from 'react';
import { Box, Checkbox, FormControlLabel, ListItemText, MenuItem, Radio, RadioGroup, TextField, Typography } from '@mui/material';
import { RadioGroupProps } from '@mui/material/RadioGroup/RadioGroup';
import { useRequest } from 'ahooks';
import { categoryApi } from '@/api';

export declare type GlobalOrCategoryResultValue = false | true | Array<number>; // 关 / 开 / 指定板块允许

const GlobalOrCategoryRadio: React.FC<
  {
    value?: GlobalOrCategoryResultValue;
    defaultValue?: GlobalOrCategoryResultValue;
    onChange?: (value: GlobalOrCategoryResultValue) => void;
    textGlobalOff?: string;
    textGlobalOn?: string;
    textCategoryOn?: string;
  } & Omit<RadioGroupProps, 'value' | 'defaultValue' | 'onChange'>
> = (props) => {
  const {
    value: propsValue,
    defaultValue,
    onChange: propsOnChange,
    textGlobalOff = '关',
    textGlobalOn = '开',
    textCategoryOn = '指定板块',
    ...otherProps
  } = props;
  const { data: categories } = useRequest(() => categoryApi.listCategorySorted());
  const categoryMap = useMemo(() => {
    const map = {} as Record<number, string>;
    (categories || []).forEach((c) => (map[c.id] = c.name));
    return map;
  }, [categories]);

  const [value, setValue] = useState<GlobalOrCategoryResultValue | undefined>(propsValue == null ? defaultValue : propsValue);

  useEffect(() => {
    if (propsValue != null) {
      setValue(propsValue);
    }
  }, [propsValue]);

  const onChange = (v: GlobalOrCategoryResultValue) => {
    if (!('value' in props)) {
      setValue(v);
    }
    propsOnChange?.(v);
  };

  const selectCategories = useMemo(() => (Array.isArray(value) ? value : []), [value]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 'none' }}>
      <RadioGroup
        {...otherProps}
        sx={{
          fontSize: '14px',
          ...otherProps.sx,
        }}
        value={Array.isArray(value) ? '2' : value ? '1' : '0'}
        onChange={(e) => {
          const checkedValue = e.target.value;
          if (checkedValue === '0') {
            onChange(false);
          } else if (checkedValue === '1') {
            onChange(true);
          } else if (checkedValue === '2') {
            onChange([]);
          }
        }}
      >
        <FormControlLabel
          value="0"
          control={<Radio size="small" sx={{ p: 0 }} />}
          label={<Typography pl={1}>{textGlobalOff}</Typography>}
        />
        <FormControlLabel value="1" control={<Radio size="small" sx={{ p: 0 }} />} label={<Typography pl={1}>{textGlobalOn}</Typography>} />
        <FormControlLabel
          value="2"
          control={<Radio size="small" sx={{ p: 0 }} />}
          label={<Typography pl={1}>{textCategoryOn}</Typography>}
        />
      </RadioGroup>
      {Array.isArray(value) && (
        <TextField
          select
          label="选择版块"
          size="small"
          sx={{ maxWidth: '50vw', marginTop: 1, minWidth: 140 }}
          SelectProps={{
            multiple: true,
            renderValue: (v) => Array.isArray(v) && v.map((id) => categoryMap[id]).join(','),
            sx: {
              fontSize: '14px',
            },
          }}
          value={selectCategories}
          onChange={(e) => onChange(e.target.value as any as GlobalOrCategoryResultValue)}
        >
          {(categories || []).map((c) => (
            <MenuItem value={c.id} key={c.id}>
              <Checkbox checked={selectCategories.indexOf(c.id) > -1} />
              <ListItemText primary={c.name} />
            </MenuItem>
          ))}
        </TextField>
      )}
    </Box>
  );
};

export default GlobalOrCategoryRadio;
