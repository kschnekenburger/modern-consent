export function loadScript(
  src: string,
  callback?: () => void,
  attrs: Record<string, string> = {},
): Promise<void> {
  return new Promise((resolve, reject) => {
    /**
     * check if already loaded.
     */
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      callback?.();
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = true;

    for (const [key, value] of Object.entries(attrs)) {
      script.setAttribute(key, value);
    }

    script.onload = () => {
      resolve();
      callback?.();
    };

    script.onerror = () => {
      reject(new Error(`Failed to load script: ${src}`));
    };
    document.head.appendChild(script);
  });
}
