import * as SphereGL from './index.js';

if (typeof window !== 'undefined') {
  globalThis.__spB = document.currentScript?.src || '';
  window.SphereGL = SphereGL;
  SphereGL.registerSphereElement('sphere-gl');

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
