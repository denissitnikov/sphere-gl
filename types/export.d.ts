import type {
  ExportBlob,
  SphereExportOptions,
  SphereRenderer,
  SphereScene,
} from './index.js';

export declare function oklabToP3Css(L: number, a: number, b: number, alpha?: number): string;
export declare function exportCSS(sceneOrRenderer: SphereScene | SphereRenderer): string;
export declare function exportSVG(
  sceneOrRenderer: SphereScene | SphereRenderer,
  options?: Pick<SphereExportOptions, 'width' | 'height' | 'grainScale'>,
): string;
export declare function exportImage(
  renderer: SphereRenderer,
  scene?: SphereScene | null,
  options?: SphereExportOptions,
): Promise<ExportBlob>;
export declare function exportImage(
  scene: SphereScene,
  options?: SphereExportOptions,
): Promise<ExportBlob>;
export declare function exportPNG(
  renderer: SphereRenderer,
  scene?: SphereScene | null,
  options?: Omit<SphereExportOptions, 'format'>,
): Promise<ExportBlob>;
export declare function exportPNG(
  scene: SphereScene,
  options?: Omit<SphereExportOptions, 'format'>,
): Promise<ExportBlob>;
