export default function loadScript(scriptUrl: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = scriptUrl;
    script.onload = () => resolve();
    script.onerror = reject;

    document.body.append(script);
  });
}
