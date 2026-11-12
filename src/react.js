'use client';

import {
  createElement,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import { getSphereTokensAndCss, mountSphereBackground } from 'sphere-gl';

let warnedStringStyle = false;

export const SphereBackground = forwardRef(function SphereBackground(
  {
    as: Tag = 'div',
    url,
    preset,
    seed,
    mode,
    style,
    mood,
    harmony,
    archetype,
    collection,
    atlas,
    colors,
    grain,
    motion,
    lightFollow,
    solar,
    solarHour,
    gamut,
    focusRect,
    transitionIn = true,
    maxDpr = 3,
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
  const isMountedRef = useRef(false);

  if (typeof style === 'string' && !warnedStringStyle) {
    warnedStringStyle = true;
    console.warn(
      '[sphere-gl] SphereBackground: pass shader mode via the `mode` prop; `style` is reserved for React CSSProperties.',
    );
  }

  const presetUrl = url || preset;
  const explicitMode = mode ?? (typeof style === 'string' ? style : undefined);
  const domStyle = typeof style === 'object' && style !== null ? style : undefined;
  const explicitAtlas = collection !== undefined ? collection : atlas;
  const explicitHarmony = harmony !== undefined ? harmony : archetype;
  const colorsKey = Array.isArray(colors) ? colors.join('|') : '';
  const focusKey = Array.isArray(focusRect) ? focusRect.join(',') : '';

  const hasDeterministicInput = Boolean(
    seed || explicitAtlas || (Array.isArray(colors) && colors.length >= 2) || presetUrl,
  );

  const ssrTokensAndCss = useMemo(() => {
    if (!hasDeterministicInput) return null;
    const fallbackSsrSeed =
      seed || undefined || (presetUrl ? undefined : `SSR:${explicitAtlas || ''}:${colorsKey}`);
    return getSphereTokensAndCss({
      url: presetUrl,
      seed: seed ?? fallbackSsrSeed,
      mode: explicitMode,
      mood,
      harmony: explicitHarmony,
      atlas: explicitAtlas,
      colors,
      solar,
      solarHour,
      gamut,
      focusRect,
    });
  }, [
    hasDeterministicInput,
    presetUrl,
    seed,
    explicitMode,
    mood,
    explicitHarmony,
    explicitAtlas,
    colorsKey,
    solar,
    solarHour,
    gamut,
    focusKey,
  ]);

  const buildConfigPayload = () => {
    if (presetUrl) {
      const payload = { url: presetUrl };
      if (seed !== undefined) payload.seed = seed;
      if (explicitMode !== undefined) payload.mode = explicitMode;
      if (mood !== undefined) payload.mood = mood;
      if (explicitHarmony !== undefined) payload.harmony = explicitHarmony;
      if (explicitAtlas !== undefined) payload.atlas = explicitAtlas;
      if (colors !== undefined) payload.colors = colors;
      if (grain !== undefined) payload.grain = grain;
      if (motion !== undefined) payload.motion = motion;
      if (lightFollow !== undefined) payload.lightFollow = lightFollow;
      if (solar !== undefined) payload.solar = solar;
      if (solarHour !== undefined) payload.solarHour = solarHour;
      if (gamut !== undefined) payload.gamut = gamut;
      if (focusRect !== undefined) payload.focusRect = focusRect;
      return payload;
    }

    return {
      seed,
      mode: explicitMode ?? 'auto',
      mood: mood ?? 'system',
      harmony: explicitHarmony ?? 'auto',
      atlas: explicitAtlas,
      colors: Array.isArray(colors) && colors.length >= 2 ? colors : undefined,
      grain: grain ?? 1.65,
      motion: motion ?? false,
      lightFollow: lightFollow ?? true,
      solar: solar ?? false,
      solarHour,
      gamut: gamut ?? 'auto',
      focusRect,
    };
  };

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
      ...buildConfigPayload(),
      transitionIn,
      maxDpr,
      onScene,
      onTiming,
    });
    instanceRef.current = inst;
    return () => {
      isMountedRef.current = false;
      inst.destroy();
      instanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!isMountedRef.current) {
      isMountedRef.current = true;
      return;
    }
    if (!instanceRef.current) return;
    instanceRef.current.regenerate(buildConfigPayload());
  }, [
    presetUrl,
    seed,
    explicitMode,
    mood,
    explicitHarmony,
    explicitAtlas,
    colorsKey,
    grain,
    motion,
    lightFollow,
    solar,
    solarHour,
    gamut,
    focusKey,
  ]);

  const inlineStyle = ssrTokensAndCss
    ? {
        position: 'relative',
        isolation: 'isolate',
        backgroundColor: ssrTokensAndCss.tokens.bg,
        background: ssrTokensAndCss.cssBackground,
        '--sphere-base': ssrTokensAndCss.tokens.bg,
        '--sphere-accent': ssrTokensAndCss.tokens.accent,
        '--sphere-ink': ssrTokensAndCss.tokens.ink,
        '--sphere-ink-muted': ssrTokensAndCss.tokens.inkMuted,
        '--sphere-glass': ssrTokensAndCss.tokens.glass,
        '--sphere-glass-border': ssrTokensAndCss.tokens.glassBorder,
        ...domStyle,
      }
    : { position: 'relative', isolation: 'isolate', ...domStyle };

  const extraAttrs = ssrTokensAndCss ? { 'data-sphere-theme': ssrTokensAndCss.theme } : {};

  return createElement(
    Tag,
    {
      ref: hostRef,
      className,
      style: inlineStyle,
      ...extraAttrs,
      ...rest,
    },
    children,
  );
});

export default SphereBackground;
