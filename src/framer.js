import { createElement, useEffect, useRef } from 'react';
import { addPropertyControls, ControlType } from 'framer';
import { ARCHETYPES, COLLECTIONS, mountSphereBackground } from './index.js';

export default function SphereGL(props) {
  const {
    sourceMode = 'generative',
    presetUrl = '',
    seed = '',
    shaderStyle = 'sphere',
    mood = 'system',
    collection = 'auto',
    atlas,
    harmony = 'auto',
    color1 = '#FBF8F0',
    color2 = '#3B82F6',
    color3 = '#FF7A45',
    color4 = '#A855F7',
    grain = 1.65,
    lightFollow = true,
    motion = false,
    style: framerLayoutStyle,
  } = props;

  const containerRef = useRef(null);
  const instanceRef = useRef(null);

  const effectiveUrl = sourceMode === 'url' ? presetUrl : '';
  const effectiveSeed = sourceMode === 'locked' && seed ? seed : undefined;
  const effectiveColors =
    sourceMode === 'custom' ? [color1, color2, color3, color4].filter(Boolean) : null;
  const rawCollection = collection !== 'auto' ? collection : atlas;
  const effectiveCollection =
    sourceMode === 'url' || sourceMode === 'custom' || !rawCollection || rawCollection === 'auto'
      ? null
      : rawCollection;

  useEffect(() => {
    if (!containerRef.current) return undefined;
    const inst = mountSphereBackground(containerRef.current, {
      url: effectiveUrl,
      seed: effectiveSeed,
      style: shaderStyle,
      mood,
      collection: effectiveCollection,
      harmony,
      colors: effectiveColors,
      grain,
      lightFollow,
      motion,
      transitionIn: false,
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
      url: effectiveUrl,
      seed: effectiveSeed,
      style: shaderStyle,
      mood,
      collection: effectiveCollection,
      harmony,
      colors: effectiveColors,
      grain,
      lightFollow,
      motion,
    });
  }, [
    sourceMode,
    effectiveUrl,
    effectiveSeed,
    shaderStyle,
    mood,
    effectiveCollection,
    harmony,
    color1,
    color2,
    color3,
    color4,
    grain,
    lightFollow,
    motion,
  ]);

  return createElement('div', {
    ref: containerRef,
    style: {
      width: '100%',
      height: '100%',
      minHeight: 200,
      position: 'relative',
      overflow: 'hidden',
      ...framerLayoutStyle,
    },
  });
}

addPropertyControls(SphereGL, {
  sourceMode: {
    type: ControlType.Enum,
    title: 'Palette',
    options: ['generative', 'locked', 'url', 'custom'],
    optionTitles: ['Fresh Each Visit', 'Lock Seed', 'Studio URL', 'Custom Colors'],
    defaultValue: 'generative',
  },
  presetUrl: {
    type: ControlType.String,
    title: 'Studio URL',
    placeholder: 'https://denissitnikov.github.io/sphere-gl/#seed=...',
    hidden: (p) => p.sourceMode !== 'url',
  },
  seed: {
    type: ControlType.String,
    title: 'Seed ID',
    placeholder: '7F3K9A',
    hidden: (p) => p.sourceMode !== 'locked',
  },
  shaderStyle: {
    type: ControlType.Enum,
    title: 'Style',
    options: ['sphere', 'mesh', 'silk', 'caustic', 'auto'],
    optionTitles: ['Sphere (f/0.95)', 'Mesh (Watercolor)', 'Silk (Ribbon)', 'Caustic (Cusps)', 'Auto'],
    defaultValue: 'sphere',
    hidden: (p) => p.sourceMode === 'url',
  },
  mood: {
    type: ControlType.Enum,
    title: 'Mood',
    options: ['system', 'any', 'light', 'split', 'dark'],
    optionTitles: ['System (OS Light/Dark)', 'Any Mood', 'Light', 'Split Horizon', 'Dark'],
    defaultValue: 'system',
    hidden: (p) => p.sourceMode === 'url' || p.sourceMode === 'custom',
  },
  collection: {
    type: ControlType.Enum,
    title: 'Atlas',
    options: ['auto', ...COLLECTIONS.map((c) => c.id)],
    optionTitles: ['All Harmonies', ...COLLECTIONS.map((c) => c.name)],
    defaultValue: 'auto',
    hidden: (p) => p.sourceMode === 'url' || p.sourceMode === 'custom',
  },
  harmony: {
    type: ControlType.Enum,
    title: 'Harmony',
    options: ['auto', ...ARCHETYPES.map((a) => a.id)],
    optionTitles: ['All Harmonies', ...ARCHETYPES.map((a) => a.name)],
    defaultValue: 'auto',
    hidden: (p) =>
      p.sourceMode === 'url' ||
      p.sourceMode === 'custom' ||
      Boolean(p.collection && p.collection !== 'auto'),
  },
  color1: {
    type: ControlType.Color,
    title: 'Base Color',
    defaultValue: '#FBF8F0',
    hidden: (p) => p.sourceMode !== 'custom',
  },
  color2: {
    type: ControlType.Color,
    title: 'Primary A',
    defaultValue: '#3B82F6',
    hidden: (p) => p.sourceMode !== 'custom',
  },
  color3: {
    type: ControlType.Color,
    title: 'Primary B',
    defaultValue: '#FF7A45',
    hidden: (p) => p.sourceMode !== 'custom',
  },
  color4: {
    type: ControlType.Color,
    title: 'Accent',
    defaultValue: '#A855F7',
    hidden: (p) => p.sourceMode !== 'custom',
  },
  grain: {
    type: ControlType.Number,
    title: 'Film Grain',
    min: 0,
    max: 2.5,
    step: 0.05,
    defaultValue: 1.65,
  },
  lightFollow: {
    type: ControlType.Boolean,
    title: 'Solas Light',
    enabledTitle: 'Follow',
    disabledTitle: 'Off',
    defaultValue: true,
  },
  motion: {
    type: ControlType.Boolean,
    title: 'Motion',
    enabledTitle: '60fps Drift',
    disabledTitle: '0% Static',
    defaultValue: false,
  },
});
