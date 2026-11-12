import type { SphereScene } from './index.js';

export interface FallbackRenderResult {
  cpuMs: number;
  lastGpuMs: null;
  width: number;
  height: number;
}

export declare function renderCanvas2DFallback(
  ctx2d: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null,
  state: Record<string, unknown>,
  scene: SphereScene,
  width: number,
  height: number,
  time?: number,
  pointer?: ArrayLike<number>,
  grainScale?: number,
): FallbackRenderResult;

export default renderCanvas2DFallback;
