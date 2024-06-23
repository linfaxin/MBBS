import React, { useMemo } from 'react';
import { Box, Checkbox, FormControlLabel, ListItemText, MenuItem, Radio, RadioGroup, TextField, Typography } from '@mui/material';
import { RadioGroupProps } from '@mui/material/RadioGroup/RadioGroup';
import { useRequest } from 'ahooks';
import { categoryApi } from '@/api';
import { CategoryPermissionType, PermissionType } from '@/api/permission';
import { getCategoryFullName } from '@/api/category';

export declare type PermissionScopeValue = false | true | Array<number>; // 不允许 / 全局允许 / 指定板块允许

export function getPermissionScopeValue(allPermissions: PermissionType[], checkPermission: CategoryPermissionType): PermissionScopeValue {
  if (allPermissions.includes(checkPermission)) return true;
  const matchCategoryIds = [] as Array<number>;
  allPermissions.forEach((p) => {
    if (p.startsWith('category') && p.endsWith(checkPermission)) {
      const idMatch = p.match(/^category(\d+)/)?.[1];
      if (idMatch) {
        matchCategoryIds.push(parseInt(idMatch));
      }
    }
  });
  if (matchCategoryIds.length) {
    return matchCategoryIds;
  }
  return false;
}

const PermissionScopeRadio: React.FC<
  {
    value?: PermissionScopeValue;
    onChange?: (value: PermissionScopeValue) => void;
    isCategoryPermission?: boolean;
  } & RadioGroupProps
> = (props) => {
  const { value, onChange, isCategoryPermission = true, ...otherProps } = props;
  const { data: categories } = useRequest(() => categoryApi.listCategorySorted());
  const categoryMap = useMemo(() => {
    const map = {} as Record<number, string>;
    (categories || []).forEach((c) => (map[c.id] = c.name));
    return map;
  }, [categories]);
  const selectCategories = useMemo(() => (Array.isArray(value) ? value : []), [value]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', flex: 'none', paddingLeft: 1, minWidth: 120 }}>
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
            onChange?.(false);
          } else if (checkedValue === '1') {
            onChange?.(true);
          } else if (checkedValue === '2') {
            onChange?.([]);
          }
        }}
      >
        <FormControlLabel value="0" control={<Radio size="small" sx={{ p: 0 }} />} label={<Typography pl={1}>不允许</Typography>} />
        <FormControlLabel
          value="1"
          control={<Radio size="small" sx={{ p: 0 }} />}
          label={<Typography pl={1}>{isCategoryPermission ? '全局允许' : '允许'}</Typography>}
        />
        {isCategoryPermission && (
          <FormControlLabel value="2" control={<Radio size="small" sx={{ p: 0 }} />} label={<Typography pl={1}>限指定版块</Typography>} />
        )}
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
          onChange={(e) => onChange?.(e.target.value as any as PermissionScopeValue)}
        >
          {(categories || []).map((c) => (
            <MenuItem value={c.id} key={c.id}>
              <Checkbox checked={selectCategories.indexOf(c.id) > -1} />
              <ListItemText primary={getCategoryFullName(c)} />
            </MenuItem>
          ))}
        </TextField>
      )}
    </Box>
  );
};

export default PermissionScopeRadio;
