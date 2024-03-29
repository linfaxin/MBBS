export const hasParentElementTag = (currentNode: Node, parentElementTagName: string) => {
  if (!currentNode) {
    return false;
  }
  if (currentNode.nodeType === 3) {
    currentNode = currentNode.parentElement as HTMLElement;
  }
  let e = currentNode as HTMLElement;
  let isClosest = false;
  while (e && !isClosest) {
    if (e.nodeName === parentElementTagName) {
      isClosest = true;
    } else {
      e = e.parentElement as HTMLElement;
    }
  }
  return isClosest && e;
};

export const vditorCDNUrlPrefix = `/vditor`;
export const vditorCDNThemePathPrefix = `${vditorCDNUrlPrefix}/dist/css/content-theme`;
export const vditorCDNEmojiPathPrefix = `${vditorCDNUrlPrefix}/dist/images/emoji`;
