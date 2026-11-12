import type * as React from 'react';
import type {
  AtlasId,
  ExportBlob,
  FocusRect,
  GamutMode,
  HarmonyId,
  MoodMode,
  SphereElementAttributes,
  SphereExportOptions,
  SphereInstance,
  SphereRegenerateOptions,
  SphereScene,
  SphereTimingInfo,
  StyleInput,
} from './index.js';

export interface SphereBackgroundProps
  extends Omit<React.HTMLAttributes<HTMLElement>, 'style' | 'onChange'> {
  /** HTML tag to render for the wrapper container (defaults to `'div'`). */
  as?: keyof React.JSX.IntrinsicElements;
  /** Preset URL copied from the Sphere Studio (`#seed=...&col=...`). */
  url?: string;
  /** Alias for `url`. */
  preset?: string;
  /** 6-character deterministic seed (`'7F3K9A'`). */
  seed?: string;
  /** Optical shader mode (`'mesh' | 'sphere' | 'silk' | 'caustic' | 'fluted' | 'prism' | 'topo' | 'auto'`). */
  mode?: StyleInput;
  /** React inline CSS styles for the wrapper element. Pass shader mode via `mode`. */
  style?: React.CSSProperties;
  /** Mood lighting (`'system' | 'any' | 'light' | 'split' | 'dark'`). */
  mood?: MoodMode;
  /** Color harmony archetype (`'auto'` or one of the 13 curated archetypes). */
  harmony?: HarmonyId;
  /** Alias for `harmony`. */
  archetype?: HarmonyId;
  /** Curated Irish optical atlas ID or semantic alias (`'ocean'`, `'fintech'`, `'amber'`, `'forest'`, `'paper'`, `'slate'`, `'sunset'`). */
  atlas?: AtlasId;
  /** Alias for `atlas`. */
  collection?: AtlasId;
  /** Custom CSS Color 4 brand palette (`#hex`, `oklch(...)`, `oklab(...)`, `hsl(...)`, `rgb(...)`). */
  colors?: readonly string[];
  /** Film grain intensity (`0` to `2.5`, default `1.65`). `0` keeps `+/-0.5 LSB` anti-banding dither. */
  grain?: number;
  /** Continuous 60fps ambient drift (`false` by default for `0%` idle GPU). */
  motion?: boolean;
  /** Solas cursor/gyroscope grazing light (`true` by default, or `0..1.5` intensity). */
  lightFollow?: boolean | number;
  /** Move bloom across the canvas with local sun elevation (`false` by default). */
  solar?: boolean;
  /** Explicit solar hour (`0..24`) for deterministic previews. */
  solarHour?: number;
  /** Color gamut target (`'auto' | 'p3' | 'srgb'`). */
  gamut?: GamutMode;
  /** Normalized `[x0, y0, x1, y1]` (`0..1`) hero text region where overlapping high-chroma/dark poles attenuate. */
  focusRect?: FocusRect;
  /** Smoothly cross-fade canvas over the instant CSS-first placeholder (`true` by default). */
  transitionIn?: boolean;
  /** Upper DPR bound (`3` by default). */
  maxDpr?: number;
  /** Fired whenever a scene is generated or morphed. */
  onScene?: (scene: SphereScene) => void;
  /** Fired with CPU and GPU frame timing telemetry. */
  onTiming?: (timing: SphereTimingInfo) => void;
  children?: React.ReactNode;
}

export interface SphereBackgroundHandle {
  readonly instance: SphereInstance | null;
  regenerate(options?: SphereRegenerateOptions): SphereScene | undefined;
  exportImage(options?: SphereExportOptions): Promise<ExportBlob> | undefined;
  exportPNG(options?: Omit<SphereExportOptions, 'format'>): Promise<ExportBlob> | undefined;
  exportSVG(options?: Pick<SphereExportOptions, 'width' | 'height' | 'grainScale'>): Promise<string> | undefined;
  exportCSS(): Promise<string> | undefined;
}

export declare const SphereBackground: React.ForwardRefExoticComponent<
  SphereBackgroundProps & React.RefAttributes<SphereBackgroundHandle>
>;

export default SphereBackground;

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'sphere-gl': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> &
        Omit<SphereElementAttributes, 'style' | 'children'>;
    }
  }
}
