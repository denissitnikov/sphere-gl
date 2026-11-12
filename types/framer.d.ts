import type * as React from 'react';
import type {
  AtlasId,
  FocusRect,
  GamutMode,
  HarmonyId,
  MoodMode,
  StyleInput,
} from './index.js';

export type FramerSourceMode = 'generative' | 'locked' | 'url' | 'custom';

export interface SphereFramerProps {
  sourceMode?: FramerSourceMode;
  presetUrl?: string;
  seed?: string;
  mode?: StyleInput;
  shaderStyle?: StyleInput;
  mood?: MoodMode;
  collection?: AtlasId;
  atlas?: AtlasId;
  harmony?: HarmonyId;
  color1?: string;
  color2?: string;
  color3?: string;
  color4?: string;
  grain?: number;
  lightFollow?: boolean;
  solar?: boolean;
  motion?: boolean;
  gamut?: GamutMode;
  focusRect?: FocusRect;
  style?: React.CSSProperties;
}

export default function SphereGL(props: SphereFramerProps): React.JSX.Element;
