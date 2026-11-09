/**
 * Browser script-tag entry (`dist/sphere-gl.min.js`).
 * Exposes `window.SphereGL` and auto-mounts any `[data-sphere-bg]` elements
 * so websites with strict CSP (`script-src 'self'`) need zero inline JavaScript.
 */

import * as SphereGL from './index.js';

if (typeof window !== 'undefined') {
  window.SphereGL = SphereGL;

  const boot = () => {
    SphereGL.autoMountSphereBackgrounds(document);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
}

export default SphereGL;
