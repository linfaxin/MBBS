import React from 'react';
import PageList, { ListFootState, ListHeadState, PropTypes } from 'rmc-pagelist';
import debounce from 'lodash.debounce';
import { Box, Button, CircularProgress, Typography } from '@mui/material';
import './index.less';

const PullElement = require('pull-element');

/** 分页加载结果 */
export interface LoadResult {
  /** 此次加载返回的数据 */
  list: any[];
  /** 是否还有下一页 */
  hasMore?: boolean;
  /** 一页加载结束 & dom 更新后回调 */
  onUpdate?: () => void;
}

export interface PageListProps extends PropTypes {
  /** 加载下一页 */
  loadPage: (pageNo: number) => Promise<LoadResult>;
  /** 刷新列表 */
  pullRefreshLoad?: () => Promise<LoadResult>;
  /** 使用 body 滚动模式 */
  useBodyScroll?: boolean;
}

const LoadingView = (
  <Box sx={{ height: '4em', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <CircularProgress color="inherit" size="2em" />
  </Box>
);

export default class AppPageList extends React.Component<PageListProps, any> {
  static defaultProps = {
    renderListNormalFoot: (pageNo: number, list: AppPageList) => LoadingView,
    renderListLoadingFoot: (pageNo: number, list: AppPageList) => LoadingView,
    renderListNoMoreFoot: (
      <Typography textAlign="center" p={2} fontSize="smaller" sx={{ opacity: 0.5 }}>
        全部加载完毕
      </Typography>
    ),
    renderListErrorFoot: (pageNo: number, error: any, list: AppPageList) => (
      <Typography onClick={() => list.onClickLoadingError()} sx={{ textAlign: 'center', padding: 4 }}>
        加载出错，点击重试
      </Typography>
    ),
    renderListNormalHead: (pageNo: number, list: PageList) => LoadingView,
    renderListReadyHead: (pageNo: number, list: PageList) => LoadingView,
    renderListRefreshingHead: (pageNo: number, list: PageList) => LoadingView,
    renderPageLoading: (pageNo: number, list: AppPageList) => null,
    renderPageEmpty: (pageNo: number, list: AppPageList) => (
      <Typography sx={{ textAlign: 'center', padding: 2, opacity: 0.7 }}>无数据</Typography>
    ),
    renderPageError: (pageNo: number, error: any, list: AppPageList) =>
      pageNo === 1 ? (
        <Box sx={{ textAlign: 'center', padding: 4 }}>
          <Typography>{error instanceof Error ? error.message : String(error)}</Typography>
          <Button variant="outlined" onClick={() => list.onClickLoadingError()} sx={{ marginTop: 1 }}>
            点击重试
          </Button>
        </Box>
      ) : null,
  };

  private list: PageList | null = null;

  private normalFooterEl: HTMLElement | null = null;

  private pullElement: any;

  componentDidMount() {
    window.addEventListener('scroll', this.checkFootVisibleAndLoadNextPageInBodyScrollMode);
    if (this.props.pullRefreshLoad && this.list?.listHeadDom) {
      // 需要下拉刷新
      const distanceToRefresh = this.list.listHeadDom.offsetHeight;
      this.pullElement = new PullElement({
        // trigger: this.touchScroll.scrollContain,
        target: this.list.touchScroll.scrollContent,
        scroller: document.body,
        detectScroll: true,
        // pullDown: true,
        onPullDown: (config: { translateY: number }) => {
          if (!this.list) return;
          const { translateY } = config;
          if (!this.list.listHeadDom) {
            this.pullElement.preventDefault();
            return;
          }
          if (this.list.state.listFootState === ListFootState.Loading || this.list.state.listHeadState === ListHeadState.Refreshing) {
            return;
          }
          if (translateY - this.list.touchScroll.scrollContain.scrollTop > distanceToRefresh) {
            if (this.list.state.listHeadState !== ListHeadState.Ready) {
              this.list.setState({ listHeadState: ListHeadState.Ready });
            }
          } else {
            if (this.list.state.listHeadState !== ListHeadState.Normal) {
              this.list.setState({ listHeadState: ListHeadState.Normal });
            }
          }
        },
        onPullDownEnd: (config: { translateY: number }) => {
          if (!this.list) return;
          const { translateY } = config;
          if (!this.list.listHeadDom) {
            this.pullElement.preventDefault();
            return;
          }
          if (translateY < 0) {
            // 下拉后，重新向上滑动场景
            this.pullElement.setTranslate(0, 0);
            document.documentElement.scrollTop = -translateY;
            document.body.scrollTop = -translateY;
            return;
          }
          if (this.list.state.listHeadState === ListHeadState.Ready && this.list.listHeadDom) {
            this.pullElement.preventDefault();
            this.pullElement.animateTo(0, distanceToRefresh);
            this.list.tryRefreshList();
          }
        },
      });
      if (this.list.pullElement) {
        this.list.pullElement.destroy();
      }
      this.list.pullElement = this.pullElement;
      this.pullElement.init();
    }
  }

  componentWillUnmount() {
    window.removeEventListener('scroll', this.checkFootVisibleAndLoadNextPageInBodyScrollMode);
    if (this.pullElement) {
      this.pullElement.destroy();
    }
  }

  reload(onSuc?: () => void, onFail?: () => void) {
    if (this.list) this.list.reload(onSuc, onFail);
  }

  onClickLoadingError() {
    if (this.list) this.list.onClickLoadingError();
  }

  private checkFootVisibleAndLoadNextPageInBodyScrollMode = debounce(() => {
    if (this.props.useBodyScroll && this.checkFootVisibleInScreen()) {
      this.list?.tryLoadNextPage();
    }
  }, 100);

  checkFootVisibleInScreen = () => {
    if (!this.normalFooterEl) return false;
    const rect = this.normalFooterEl.getBoundingClientRect();
    if (rect.top >= window.innerHeight) return false;
    if (rect.bottom <= 0) return false;
    if (rect.left >= window.innerWidth) return false;
    if (rect.right <= 0) return false;
    return true;
  };

  render() {
    const { children, useBodyScroll, ...otherProps } = this.props;

    if (useBodyScroll) {
      otherProps.renderListNormalFoot = () => <div ref={(ref) => (this.normalFooterEl = ref as HTMLElement)} style={{ height: '4em' }} />;
      // otherProps.checkCanRefreshPage = () => false;
      otherProps.checkCanLoadNextPage = this.checkFootVisibleInScreen;
      otherProps.fixAndroidInputAutoScroll = false;
      otherProps.fixReachBottomMoveBug = false;
      otherProps.fixReachTopMoveBug = false;
      otherProps.scrollableIfContentShort = false;
      // otherProps.pullRefreshLoad = undefined;
    }

    return (
      <PageList
        {...otherProps}
        ref={(ref) => (this.list = ref)}
        className={`app-page-list ${useBodyScroll ? 'no-inner-scroll' : ''} ${this.props.className || ''}`}
      >
        {children}
      </PageList>
    );
  }
}
