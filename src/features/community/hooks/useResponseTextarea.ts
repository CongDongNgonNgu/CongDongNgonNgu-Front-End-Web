import { useLayoutEffect, useRef, type RefObject } from 'react';

/** Reflow on content and width changes; keep long drafts inside a bounded editor. */
export function useResponseTextarea(value: string): RefObject<HTMLTextAreaElement> {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    let previousWidth = element.clientWidth;
    const resize = () => {
      element.style.height = 'auto';
      const contentHeight = element.scrollHeight + element.offsetHeight - element.clientHeight;
      if (!contentHeight) return; // Layout is unavailable for hidden/unmounted controls.
      element.style.height = `${Math.min(contentHeight, 240)}px`;
      element.style.overflowY = contentHeight > 240 ? 'auto' : 'hidden';
    };
    resize();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => {
      if (element.clientWidth !== previousWidth) {
        previousWidth = element.clientWidth;
        resize();
      }
    }) : null;
    observer?.observe(element);
    window.addEventListener('resize', resize);
    return () => { observer?.disconnect(); window.removeEventListener('resize', resize); };
  }, [value]);
  return ref;
}
