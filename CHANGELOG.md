# Changelog

## [1.4.2] - 2026-11-11

### Fixed
- Studio URL initialization now applies `?preview=website` (`view=`), `mood`, `grain`, `motion`, `light`, `hour`, and `arch` even when `seed` or `style` is omitted from the URL, and responds to live `hashchange` updates.
- `parsePresetUrl` and `formatPresetUrl` now round-trip `preview` (`canvas` | `website` | `wallpaper`), `light=0`, and `hour` (automatically enabling `solar` when `hour` is set).
- Fixed *Boyne Solstice* (`eclipse` topology) in `Light` and `Split` modes so `baseOverride` only applies to dark moods, preserving `WCAG >= 4.5:1` contrast across all 15 atlases and all moods.
- Fixed Studio `System`, `Any`, and `Auto` toggles when an Optical Atlas is active, cleared active atlas scenes when clicking `All 15` in the Atlases drawer, and updated Solar Clock scrubbing to replace the current scene in place without flooding history.

## [1.4.1] - 2026-11-10

### Added
- Published `sphere-gl` to npm with `exports` entrypoints for `.`, `./react`, and `./framer`.
- Added `CONTRIBUTING.md`, `SECURITY.md`, and `CHANGELOG.md`, plus explicit `engines` (`node >= 18`) and `esbuild` devDependency in `package.json`.

### Changed
- Tightened `.github/workflows/ci.yml` with read-only `contents: read` permissions and pull request concurrency cancellation.
- Updated Studio embed snippets and documentation for `v1.4.1` and all 15 Irish atlases.

## [1.4.0] - 2026-11-10

### Added
- Emerald Isle atlas pack (7 new Irish atlases: *Dawn Meadow*, *Moss & Stone*, *Peat Bog*, *Gorse Hedgerow*, *Moher Slate*, *Glen Shade*, *Oak Canopy*).
- Solar Clock (`data-sphere-solar`, `solar={true}`, `&hour=`): positions the keylight along an east-to-west arc from the visitor's local time of day, re-rendering once every 10 minutes via `setTimeout` at `0%` idle GPU.
- Two-tier resolution scaling (`1.6 MP` interactive cap with native `3x` DPR static frames), phone tilt `Solas Light` (`deviceorientation`), `<meta name="theme-color">` sync, and mobile Studio layout (`100dvh`, safe-area insets, swipeable two-row dock).

## [1.3.0] - 2026-11-09

### Added
- Coast & Sky Irish optical atlases (*Burren Chalk*, *Skellig Night*, *Antrim Basalt*, *Boyne Solstice*, *Wicklow Amber*, *Achill Dusk*, *Dingle Horizon*, *Connemara Lough*).
- `Solas Light` wake-on-pointer grazing keylight that returns to `0%` GPU when pointer movement stops.
- `caustic` optical rendering style and smooth `OKLab` seed/theme morphing (`regenerate({ morph: true })`).
- `WebP`, `JPG`, vector `SVG`, and pure `CSS` radial-gradient fallback exports alongside `4K`/`5K` `PNG`.

## [1.2.0] - 2026-11-09

### Added
- Automatic OS and browser dark/light mode alignment (`mood="system"` default) watching `prefers-color-scheme` and `<html class="dark">` mutations while locking sphere geometry across theme flips.

## [1.1.0] - 2026-11-08

### Added
- Adaptive UI CSS custom properties (`--sphere-ink`, `--sphere-glass`, `--sphere-glass-border`) with `WCAG >= 4.5:1` contrast enforcement.
- Shareable Studio preset URLs (`parsePresetUrl`, `formatPresetUrl`), React wrapper (`sphere-gl/react`), and Framer code component (`sphere-gl/framer`).

## [1.0.0] - 2026-11-08

### Added
- Initial WebGL2 + Canvas2D fallback procedural background and 5K wallpaper studio with `OKLCH` color harmonies, `OKLab` anti-muddy midtone bridging, and monochromatic PCG film grain.
