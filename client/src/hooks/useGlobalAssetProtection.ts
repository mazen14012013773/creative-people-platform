import { useEffect } from 'react';

export const useGlobalAssetProtection = (): void => {
  useEffect(() => {
    const isEditable = (target: EventTarget | null): boolean => target instanceof HTMLElement &&
      (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));
    const blockAssetContextMenu = (event: MouseEvent) => {
      if (event.target instanceof Element && event.target.closest('img, picture, video, canvas')) event.preventDefault();
    };
    const blockAssetDrag = (event: DragEvent) => {
      if (event.target instanceof Element && event.target.closest('img, picture, video, canvas')) event.preventDefault();
    };
    const blockCaptureShortcuts = (event: KeyboardEvent) => {
      if (isEditable(event.target)) return;
      const key = event.key.toLowerCase();
      const command = event.ctrlKey || event.metaKey;
      if (event.key === 'F12' || (command && (key === 'u' || key === 's')) ||
        (event.ctrlKey && event.shiftKey && ['i', 'j', 'c'].includes(key)) || event.key === 'PrintScreen') {
        event.preventDefault();
      }
    };
    document.addEventListener('contextmenu', blockAssetContextMenu);
    document.addEventListener('dragstart', blockAssetDrag);
    window.addEventListener('keydown', blockCaptureShortcuts, true);
    return () => {
      document.removeEventListener('contextmenu', blockAssetContextMenu);
      document.removeEventListener('dragstart', blockAssetDrag);
      window.removeEventListener('keydown', blockCaptureShortcuts, true);
    };
  }, []);
};
