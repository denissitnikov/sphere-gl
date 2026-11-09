'use client';
/**
 * sphere-gl/react
 * Zero-bloat React / Next.js wrapper for SphereGL.
 * Supports generative OKLCH reload palettes, Studio URL presets (`url="..."`),
 * custom brand hex arrays, and adaptive `--sphere-ink` / `--sphere-glass` CSS tokens.
 */

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
    mood = 'auto',
    harmony = 'auto',
    colors,
    grain = 1.65,
    motion = false,
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

  // Allow `mode="sphere"` OR string `style="sphere"` without breaking React CSS `style={{...}}`
  const resolvedMode = mode || (typeof style === 'string' ? style : 'auto');
  const domStyle = typeof style === 'object' && style !== null ? style : undefined;
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
      exportPNG(opts) {
        return instanceRef.current?.exportPNG(opts);
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
      colors,
      grain,
      motion,
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
      colors: Array.isArray(colors) && colors.length >= 2 ? colors : null,
      grain,
      motion,
    });
  }, [url, preset, seed, resolvedMode, mood, harmony, colorsKey, grain, motion]);

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
