import React, { ReactElement } from 'react';
import ReactDom from 'react-dom';
import CustomThemeWrapper from '@/components/custom-theme-wrapper';

export default function renderInExtra(element: ReactElement): () => void {
  let mountDiv: HTMLElement | null = document.createElement('div');
  mountDiv.setAttribute('data-extra-render', '');
  document.body.appendChild(mountDiv);

  function doClose() {
    if (!mountDiv) return;
    ReactDom.unmountComponentAtNode(mountDiv);
    document.body.removeChild(mountDiv);
    mountDiv = null;
  }

  ReactDom.render(<CustomThemeWrapper>{element}</CustomThemeWrapper>, mountDiv);

  return doClose;
}
