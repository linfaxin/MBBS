export function isInAlipayMiniApp() {
  return /MiniProgram/i.test(navigator.userAgent) && /AliApp/.test(navigator.userAgent);
}

export function isInWechatMiniApp() {
  return /MiniProgram/i.test(navigator.userAgent) && /MicroMessenger/i.test(navigator.userAgent);
}
