import React, { useMemo } from 'react';
import QueryString from 'query-string';
import OpenPopupMarkdownEditor, { OpenPopupMarkdownEditorProps } from '@/components/open-popup-markdown-editor';
import { useLocation, history } from 'umi';

const DefaultQueryKey = 'popup_md';
const PopupKeyPrefix = `${Date.now().toString(36).substring(2)}_`;
let autoPopupKeyNext = 1;
const OpenPopupMarkdownEditWithUrlQuery: React.FC<
  OpenPopupMarkdownEditorProps & {
    queryKey?: string;
    popupKey?: string;
  }
> = (props) => {
  const { queryKey = DefaultQueryKey, popupKey, children, ...otherProps } = props;
  const umiLocation = useLocation();
  const queryValue = useMemo(() => popupKey || `${PopupKeyPrefix}${autoPopupKeyNext++}`, [popupKey]);
  const open = useMemo(() => QueryString.parse(umiLocation.search)[queryKey] === queryValue, [umiLocation.search, queryKey, queryValue]);

  return (
    <OpenPopupMarkdownEditor
      {...otherProps}
      open={open}
      onOpenChange={(open) => {
        if (open) {
          const query = QueryString.parse(umiLocation.search);
          query[queryKey] = queryValue;
          history.push(`?${QueryString.stringify(query)}`);
        } else {
          history.goBack();
        }
      }}
    >
      {children}
    </OpenPopupMarkdownEditor>
  );
};

export default OpenPopupMarkdownEditWithUrlQuery;
