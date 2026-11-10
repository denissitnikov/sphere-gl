'use client';

import {
  createElement,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';
import { mountSphereBackground } from './index.js';

export const SphereBackground = forwardRef(function SphereBackground(
  {
    as: Tag = 'div',
    url,
    preset,
    seed,
    mode,
    style,
    mood = 'system',
    harmony = 'auto',
    collection,
    atlas,
    colors,
    grain = 1.65,
    motion = false,
    lightFollow = true,
    transitionIn = true,
    maxDpr = 2,
    onScene,
    onTiming,
    className,
    children,
    ...rest
  },
  ref,
) {
  const hostRef = useRef(null);
  const instanceRef = useRef(null);

  const resolvedMode = mode || (typeof style === 'string' ? style : 'auto');
  const domStyle = typeof style === 'object' && style !== null ? style : undefined;
  const resolvedCollection = collection ?? atlas ?? null;
  const colorsKey = Array.isArray(colors) ? colors.join(',') : '';

  useImperativeHandle(
    ref,
    () => ({
      get instance() {
        return instanceRef.current;
      },
      regenerate(opts) {
        return instanceRef.current?.regenerate(opts);
      },
      exportImage(opts) {
        return instanceRef.current?.exportImage(opts);
      },
      exportPNG(opts) {
        return instanceRef.current?.exportPNG(opts);
      },
      exportSVG(opts) {
        return instanceRef.current?.exportSVG(opts);
      },
      exportCSS() {
        return instanceRef.current?.exportCSS();
      },
    }),
    [],
  );

  useEffect(() => {
    if (!hostRef.current) return undefined;
    const inst = mountSphereBackground(hostRef.current, {
      url: url || preset,
      seed,
      style: resolvedMode,
      mood,
      harmony,
      collection: resolvedCollection,
      colors,
      grain,
      motion,
      lightFollow,
      transitionIn,
      maxDpr,
      onScene,
      onTiming,
    });
    instanceRef.current = inst;
    return () => {
      inst.destroy();
      instanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!instanceRef.current) return;
    instanceRef.current.regenerate({
      url: url || preset,
      seed,
      style: resolvedMode,
      mood,
      harmony,
      collection: resolvedCollection,
      colors: Array.isArray(colors) && colors.length >= 2 ? colors : null,
      grain,
      motion,
      lightFollow,
    });
  }, [
    url,
    preset,
    seed,
    resolvedMode,
    mood,
    harmony,
    resolvedCollection,
    colorsKey,
    grain,
    motion,
    lightFollow,
  ]);

  return createElement(
    Tag,
    {
      ref: hostRef,
      className,
      style: { position: 'relative', isolation: 'isolate', ...domStyle },
      ...rest,
    },
    children,
  );
});

export default SphereBackground;
