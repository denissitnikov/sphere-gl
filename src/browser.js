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
