export type StyleMode = 'mesh' | 'sphere' | 'silk' | 'caustic' | 'fluted' | 'prism' | 'topo';
export type StyleInput = StyleMode | 'auto';
export type MoodMode = 'system' | 'any' | 'light' | 'split' | 'dark';
export type ResolvedMood = 'light' | 'split' | 'dark';
export type GamutMode = 'auto' | 'p3' | 'srgb';
export type ResolvedGamut = 'p3' | 'srgb';
export type AtlasGroupId = 'coast' | 'emerald';

export type CoreAtlasId =
  | 'burren-chalk'
  | 'skellig-night'
  | 'antrim-basalt'
  | 'boyne-solstice'
  | 'wicklow-amber'
  | 'achill-dusk'
  | 'dingle-horizon'
  | 'connemara-lough'
  | 'dawn-meadow'
  | 'moss-stone'
  | 'peat-bog'
  | 'gorse-hedgerow'
  | 'moher-slate'
  | 'glen-shade'
  | 'oak-canopy';

export type AtlasAlias =
  | 'ocean'
  | 'fintech'
  | 'sapphire'
  | 'navy'
  | 'midnight'
  | 'amber'
  | 'gold'
  | 'luxury'
  | 'bronze'
  | 'honey'
  | 'forest'
  | 'sage'
  | 'matcha'
  | 'meadow'
  | 'mint'
  | 'paper'
  | 'editorial'
  | 'minimal'
  | 'chalk'
  | 'ivory'
  | 'slate'
  | 'obsidian'
  | 'mono'
  | 'charcoal'
  | 'sunset'
  | 'coral'
  | 'horizon'
  | 'peach'
  | 'eclipse'
  | 'solstice'
  | 'lavender'
  | 'twilight'
  | 'violet'
  | 'teal'
  | 'lagoon'
  | 'jade'
  | 'moss'
  | 'stone'
  | 'granite'
  | 'peat'
  | 'earth'
  | 'gorse'
  | 'citrine'
  | 'cliff'
  | 'nordic'
  | 'fern'
  | 'emerald'
  | 'oak'
  | 'olive';

export type AtlasId = CoreAtlasId | AtlasAlias | 'auto' | 'all' | 'none';

export type CoreHarmonyId =
  | 'alabaster-honey'
  | 'porcelain-peach-sage'
  | 'morning-lilac-pearl'
  | 'solstice-ochre-mist'
  | 'cerulean-tangerine'
  | 'steel-lavender-amber'
  | 'aegean-coral-horizon'
  | 'twilight-violet-citrine'
  | 'electric-sapphire'
  | 'velvet-ember-obsidian'
  | 'abyssal-aurora-jade'
  | 'nocturne-amethyst-rose'
  | 'harmonic-wild';

export type HarmonyId = CoreHarmonyId | 'auto';

export type OklabTuple = [number, number, number];
export type FocusRect = readonly [number, number, number, number];
export type PreviewMode = 'website' | 'wallpaper' | 'canvas';
export type ExportFormat = 'png' | 'webp' | 'jpg' | 'jpeg' | 'svg';

export interface ArchetypeDefinition {
  readonly id: CoreHarmonyId;
  readonly name: string;
  readonly mood: ResolvedMood | 'auto';
  readonly defaultStyle: StyleMode | 'auto';
}

export interface AtlasDefinition {
  readonly id: CoreAtlasId;
  readonly group: AtlasGroupId;
  readonly name: string;
  readonly tag: string;
  readonly style: StyleMode;
  readonly mood: ResolvedMood;
  readonly hues: readonly [readonly [number, number], readonly [number, number], readonly [number, number]];
  readonly baseH: readonly [number, number];
  readonly cScale: number;
  readonly poleLift: number;
  readonly activePoles: number;
  readonly topology?: 'eclipse';
}

export interface AtlasGroupDefinition {
  readonly id: AtlasGroupId;
  readonly name: string;
}

export interface SpherePole {
  lab: OklabTuple;
  hex: string;
  pos: [number, number];
  radius: number;
  softness: number;
  stretch: [number, number];
  angle: number;
  weight: number;
}

export interface SphereUiTokens {
  theme: 'light' | 'dark';
  bg: string;
  ink: '#FFFFFF' | '#0F172A' | '#020617';
  inkMuted: string;
  glass: string;
  glassBorder: string;
  accent: string;
}

export interface SphereWarp {
  scale: number;
  amount: number;
  foldStrength: number;
  phase: [number, number];
  flowAngle: number;
}

export interface SphereLighting {
  scatterLift: number;
  chromaPreserve: number;
  vignette: number;
  grain: number;
}

export interface SphereSolarState {
  hour: number;
  x: number;
  elev: number;
  isNight: boolean;
}

export interface SolarPhaseResult {
  hour: number;
  x: number;
  elev: number;
  warmth: number;
  isNight: boolean;
}

export interface SphereScene {
  seed: string;
  style: StyleMode;
  mode: StyleMode;
  mood: ResolvedMood;
  gamut: ResolvedGamut;
  collection: CoreAtlasId | null;
  atlas: CoreAtlasId | null;
  focusRect: [number, number, number, number] | null;
  solar: SphereSolarState | null;
  archetypeId: CoreHarmonyId | CoreAtlasId | 'custom-palette';
  archetypeName: string;
  isDark: boolean;
  baseLab: OklabTuple;
  baseHex: string;
  bloomLab: OklabTuple;
  bloomHex: string;
  bloomPos: [number, number];
  bloomRadius: number;
  bloomStrength: number;
  bridgeDir: [number, number];
  poles: SpherePole[];
  paletteSwatches: string[];
  swatches: string[];
  uiTokens: SphereUiTokens;
  warp: SphereWarp;
  lighting: SphereLighting;
}

export interface HeroGridLuminance {
  sorted: number[];
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  midLab: OklabTuple;
}

export interface GenerateSceneOptions {
  seed?: string | null;
  mode?: StyleInput;
  style?: StyleInput;
  mood?: MoodMode | 'daylight';
  harmony?: HarmonyId;
  archetype?: HarmonyId;
  atlas?: AtlasId | null;
  collection?: AtlasId | null;
  colors?: readonly string[] | null;
  colorScheme?: 'light' | 'dark' | null;
  lockGeometrySeed?: boolean;
  solar?: boolean;
  solarHour?: number | null;
  gamut?: GamutMode;
  focusRect?: FocusRect | null;
}

export interface ParsedPresetUrl {
  preview?: PreviewMode;
  seed?: string;
  mode?: string;
  style?: string;
  mood?: string;
  harmony?: string;
  atlas?: CoreAtlasId;
  collection?: CoreAtlasId;
  grain?: number;
  motion?: boolean;
  lightFollow?: boolean | number;
  solar?: boolean;
  solarHour?: number;
  colors?: string[];
  gamut?: GamutMode;
  focusRect?: [number, number, number, number];
}

export interface FormatPresetUrlOptions {
  grain?: number;
  motion?: boolean;
  lockSeed?: boolean;
  colors?: readonly string[] | null;
  solar?: boolean;
  solarHour?: number | null;
  lightFollow?: boolean | number;
  preview?: PreviewMode | null;
  baseUrl?: string;
}

export interface SphereTokensAndCssOptions extends GenerateSceneOptions {
  url?: string;
  preset?: string;
  scene?: SphereScene;
}

export interface SphereTokensAndCss {
  tokens: SphereUiTokens;
  cssBackground: string;
  theme: 'light' | 'dark';
  scene: SphereScene;
}

export interface SphereTimingInfo {
  cpuMs: number;
  gpuMs: number | null;
  width: number;
  height: number;
  backend: 'webgl2' | 'canvas2d';
}

export interface SphereRenderResult {
  cpuMs: number;
  lastGpuMs: number | null;
  width: number;
  height: number;
  pending?: boolean;
}

export interface SphereResizeResult {
  width: number;
  height: number;
  dpr: number;
}

export interface SphereRendererOptions {
  onTiming?: ((timing: SphereTimingInfo) => void) | null;
  onFirstFrame?: (() => void) | null;
  maxDpr?: number;
  pixelBudget?: number;
  interactiveBudget?: number;
  preserveDrawingBuffer?: boolean;
  gamut?: GamutMode;
}

export interface SphereRenderOptions {
  time?: number;
  pointer?: ArrayLike<number>;
  grainScale?: number;
  whisper?: number;
  sync?: boolean;
}

export interface SphereMorphOptions {
  duration?: number;
  grainScale?: number;
  onUpdate?: (progress: number, nextScene: SphereScene) => void;
  onComplete?: (nextScene: SphereScene) => void;
}

export interface SphereMotionOptions {
  speed?: number;
  grainScale?: number;
}

export interface SphereWakeOptions {
  strength?: number;
  grainScale?: number;
}

export interface ExportBlob extends Blob {
  readonly degraded: boolean;
}

export interface SphereExportOptions {
  width?: number;
  height?: number;
  format?: ExportFormat;
  quality?: number;
  grainScale?: number;
  time?: number;
  pointer?: readonly [number, number];
  whisper?: number;
  strict?: boolean;
  onDegraded?: ((info: { degraded: true; reason: string }) => void) | null;
}

export interface SphereOptions {
  url?: string;
  preset?: string;
  seed?: string | null;
  mode?: StyleInput;
  style?: StyleInput;
  mood?: MoodMode;
  harmony?: HarmonyId;
  archetype?: HarmonyId;
  atlas?: AtlasId | null;
  collection?: AtlasId | null;
  colors?: readonly string[] | null;
  grain?: number;
  grainScale?: number;
  motion?: boolean;
  lightFollow?: boolean | number;
  solar?: boolean;
  solarHour?: number | null;
  gamut?: GamutMode;
  focusRect?: FocusRect | null;
  transitionIn?: boolean;
  maxDpr?: number;
  interactivePointer?: boolean;
  onScene?: (scene: SphereScene) => void;
  onTiming?: (timing: SphereTimingInfo) => void;
}

export interface SphereRegenerateOptions extends Omit<SphereOptions, 'transitionIn' | 'maxDpr' | 'interactivePointer' | 'onScene' | 'onTiming'> {
  seed?: string | 'random' | 'auto' | null;
  newSeed?: boolean;
  morph?: boolean;
  morphDuration?: number;
}

export interface SphereInstance {
  readonly canvas: HTMLCanvasElement;
  readonly renderer: SphereRenderer;
  readonly scene: SphereScene | null;
  readonly isIntersecting: boolean;
  regenerate(options?: SphereRegenerateOptions): SphereScene;
  enableTilt(): Promise<boolean>;
  refreshCssVariables(): SphereScene;
  exportImage(options?: SphereExportOptions): Promise<ExportBlob>;
  exportPNG(options?: Omit<SphereExportOptions, 'format'>): Promise<ExportBlob>;
  exportSVG(options?: Pick<SphereExportOptions, 'width' | 'height' | 'grainScale'>): Promise<string>;
  exportCSS(): Promise<string>;
  destroy(): void;
}

export declare class SphereRenderer {
  readonly canvas: HTMLCanvasElement | OffscreenCanvas;
  onTiming: ((timing: SphereTimingInfo) => void) | null;
  maxDpr: number;
  pixelBudget: number;
  interactiveBudget: number;
  readonly pointer: Float32Array;
  readonly targetPointer: Float32Array;
  readonly gl: WebGL2RenderingContext | null;
  readonly ctx2d: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
  readonly backend: 'webgl2' | 'canvas2d';
  readonly gamut: GamutMode;
  readonly lastCpuMs: number;
  readonly lastGpuMs: number | null;
  readonly isAnimating: boolean;
  readonly tier: 'static' | 'interactive';
  readonly isWhispering: boolean;
  readonly isMorphing: boolean;

  constructor(canvas: HTMLCanvasElement | OffscreenCanvas, options?: SphereRendererOptions);
  setGamut(gamut?: GamutMode): void;
  resize(tier?: 'static' | 'interactive'): SphereResizeResult;
  setPointer(nx: number, ny: number): void;
  wakePointer(nx: number, ny: number, options?: SphereWakeOptions): void;
  morphTo(nextScene: SphereScene, options?: SphereMorphOptions): void;
  startMotion(scene?: SphereScene | null, options?: SphereMotionOptions): void;
  startLoop(scene?: SphereScene | null, options?: SphereMotionOptions): void;
  stopMotion(): void;
  stopLoop(): void;
  renderOnce(scene: SphereScene, options?: SphereRenderOptions): SphereRenderResult;
  render(scene: SphereScene, options?: SphereRenderOptions): SphereRenderResult;
  exportImage(sceneOrOptions?: SphereScene | SphereExportOptions, options?: SphereExportOptions): Promise<ExportBlob>;
  exportPNG(sceneOrOptions?: SphereScene | Omit<SphereExportOptions, 'format'>, options?: Omit<SphereExportOptions, 'format'>): Promise<ExportBlob>;
  exportSVG(sceneOrOptions?: SphereScene | Pick<SphereExportOptions, 'width' | 'height' | 'grainScale'>, options?: Pick<SphereExportOptions, 'width' | 'height' | 'grainScale'>): Promise<string>;
  exportCSS(scene?: SphereScene): Promise<string>;
  destroy(): void;
}

export { SphereRenderer as AuraRenderer };

export interface SphereElement extends HTMLElement {
  readonly instance: SphereInstance | null;
  regenerate(options?: SphereRegenerateOptions): SphereScene | undefined;
}

export interface SphereElementAttributes {
  seed?: string;
  mode?: StyleInput;
  style?: string | Record<string, unknown>;
  mood?: MoodMode;
  atlas?: AtlasId;
  harmony?: HarmonyId;
  grain?: number | `${number}`;
  motion?: boolean | '' | 'true' | 'false';
  'light-follow'?: boolean | '' | 'true' | 'false' | number | `${number}`;
  solar?: boolean | '' | 'true' | 'false';
  hour?: number | `${number}`;
  colors?: string;
  preset?: string;
  class?: string;
  className?: string;
  id?: string;
  children?: unknown;
}

export declare const STYLE_MODES: readonly StyleMode[];
export declare const MOOD_MODES: readonly MoodMode[];
export declare const GAMUT_MODES: readonly GamutMode[];
export declare const STYLE_MAP: Readonly<Record<StyleMode, number>>;
export declare const ARCHETYPES: readonly ArchetypeDefinition[];
export declare const COLLECTIONS: readonly AtlasDefinition[];
export declare const ATLASES: readonly AtlasDefinition[];
export declare const ATLAS_GROUPS: readonly AtlasGroupDefinition[];

export declare function styleToIndex(style: string): number;
export declare function clamp(value: number, min: number, max: number): number;
export declare function hashSeed32(seed: string): number;
export declare function normalizeAtlasId(raw: string | null | undefined): CoreAtlasId | (string & {}) | null;
export declare function detectColorScheme(): 'light' | 'dark';
export declare function detectDisplayP3(): boolean;
export declare function solarPhase(date?: Date, hourOverride?: number | null): SolarPhaseResult;
export declare function randomSeed(): string;
export declare function oklchToOklab(L: number, C: number, hDeg: number): OklabTuple;
export declare function oklabToLinearSrgb(L: number, a: number, b: number): [number, number, number];
export declare function oklabToLinearP3(L: number, a: number, b: number): [number, number, number];
export declare function clampToGamutOklab(L: number, C: number, hDeg: number): OklabTuple;
export declare function clampToP3Oklab(L: number, C: number, hDeg: number): OklabTuple;
export declare function srgbEncode(linear: number): number;
export declare function oklabToSrgbHex(L: number, a: number, b: number): string;
export declare function parseColorToOklab(input: string): OklabTuple | null;
export declare function srgbHexToOklab(input: string): OklabTuple | null;
export declare function parseCssColorBytes(input: string): [number, number, number] | null;
export declare function sampleHeroGridLuminance(sceneOrContext: SphereScene | Record<string, unknown>, bounds?: FocusRect | null): HeroGridLuminance;
export declare function computeUiTokens(sceneOrContext: SphereScene | Record<string, unknown>, baseHex?: string, poles?: readonly SpherePole[], swatches?: readonly string[], focusBounds?: FocusRect | null): SphereUiTokens;
export declare function generateScene(options?: GenerateSceneOptions): SphereScene;
export declare function buildInlineCssLayers(scene: SphereScene): string[];
export declare function buildInlineCssBackground(scene: SphereScene): string;
export declare function parsePresetUrl(url: string): ParsedPresetUrl;
export declare function formatPresetUrl(scene: SphereScene, options?: FormatPresetUrlOptions): string;
export declare function getSphereTokensAndCss(options?: SphereTokensAndCssOptions): SphereTokensAndCss;
export declare function mountSphereBackground(target?: string | HTMLElement | HTMLCanvasElement | null, options?: SphereOptions): SphereInstance;
export declare function mount(target?: string | HTMLElement | HTMLCanvasElement | null, options?: SphereOptions): SphereInstance;
export declare function mountAuraBackground(target?: string | HTMLElement | HTMLCanvasElement | null, options?: SphereOptions): SphereInstance;
export declare function autoMountSphereBackgrounds(root?: ParentNode | Document): SphereInstance[];
export declare function registerSphereElement(tagName?: string): CustomElementConstructor | null;

declare global {
  interface HTMLElementTagNameMap {
    'sphere-gl': SphereElement;
  }
  namespace JSX {
    interface IntrinsicElements {
      'sphere-gl': SphereElementAttributes;
    }
  }
}
