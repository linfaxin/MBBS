declare module '*.css';
declare module '*.less';
declare module '*.png';
declare module '*.svg' {
  export function ReactComponent(props: React.SVGProps<SVGSVGElement>): React.ReactElement;
  const url: string;
  export default url;
}
interface Window {
  /** 接口地址前缀 */
  MBBS_BASE_URL: string;
  /** 资源访问地址前缀 */
  MBBS_RESOURCE_BASE_URL: string;
}
