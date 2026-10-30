# Artwork and source record — Aura 8.3.0

Updated 30 October 2026. The four base photographs remain unchanged at **428,582 bytes**, and five light derivatives remain **306,690 bytes**. Combined photographic assets still total **735,272 bytes**. Version 8.3 redesigns the four original scene SVGs; it adds no external image source.

All shipped imagery is bundled locally. The extension makes no runtime requests to a photo service. There are no Marvel film stills, official character images, team logos added as artwork, externally hosted fonts, trackers or remote scripts.

## Photographic environments

| Packaged file | Creator and source | Reuse basis | Processing |
| --- | --- | --- | --- |
| assets/pink-satin.webp | [Rue S - pink satin fabric](https://unsplash.com/photos/a-close-up-of-a-pink-satin-fabric-UD3J62hI_jE) | Page identifies the photograph as free under the [Unsplash License](https://unsplash.com/license). | Rose color grade, WebP compression; original fabric detail retained. |
| assets/cosmic-galaxy.webp | [Hubble - barred spiral galaxy NGC 1300](https://science.nasa.gov/asset/hubble/barred-spiral-galaxy-ngc-1300/) | NASA source; [NASA images and media guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/). | Reduced to 1600 x 913 and compressed to WebP. |
| assets/motorsport-track.webp | [Talon-Kai Honeyman - Formula 1 race car](https://unsplash.com/photos/a-formula-1-race-car-speeds-around-a-track-MFBvSfwuGUI) | Page identifies the photograph as free under the [Unsplash License](https://unsplash.com/license). | Reduced saturation, darker lighting, selective offline defocus of the background fence; car detail retained. No live blur/filter processing. |
| assets/marvel-alloy.webp | [Tom Caillarec - blue light on corrugated metal](https://unsplash.com/photos/blue-light-patterns-on-metal-a221uixhkYY) | Page identifies the photograph as free under the [Unsplash License](https://unsplash.com/license). | Warm alloy reflections balanced with cool light, restrained contrast and WebP compression. This is photographed metal, not official Marvel artwork. |

Hubble image credit: **NASA, ESA, and The Hubble Heritage Team (STScI/AURA); Acknowledgment: P. Knezek (WIYN).**

The Unsplash license permits downloading, modifying, distributing and using the selected photographs, including commercial use; the photographs are integrated into a designed extension rather than sold as standalone images. Source and license pages were checked on 27 October 2026. Existing marks in the racing photograph remain part of that photograph; no affiliation or endorsement is claimed. The image license is not a grant of trademark or character rights.

No additional movie or superhero asset is required for the implemented Marvel-inspired design. Adding official Marvel character art or film stills later would require a separately cleared source; none is represented here as licensed.

## Photographic light derivatives

Version 8.2 adds five WebP light exposures derived from the already packaged photographs. They introduce no new external asset source or rights claim. Original credits and reuse conditions above apply to their derivatives.

| Packaged file | Existing source photograph | Bytes |
| --- | --- | ---: |
| assets/light-bloom.webp | Pink satin by Rue S | 73,762 |
| assets/light-orbit.webp | Hubble NGC 1300 | 63,248 |
| assets/light-orbit-stars.webp | Hubble NGC 1300 | 49,244 |
| assets/light-shinobi.webp | Racing photograph by Talon-Kai Honeyman | 69,136 |
| assets/light-marvel.webp | Corrugated metal by Tom Caillarec | 51,300 |
| **Total derivatives** | | **306,690** |

The four base photographs plus these five light files total **735,272 bytes**. Each theme uses two inert background spans for its light exposures; the base photograph remains fixed.

The 8.3 local browser matrix passes 632 checks, retaining photo/light decoding and fixed-backdrop coverage alongside the new vector details. All four feed/profile previews were visually reviewed. See [AUDIT.md](AUDIT.md) for exact coverage and installed LinkedIn limits.

## Original vector artwork and production use

Version 8.3 redesigns the four original scene SVGs as transparent compositions, with no text, franchise logo or character likeness:

| File | Theme detail |
| --- | --- |
| assets/scene-bloom.svg | Folded-petal forms and satin-like shading |
| assets/scene-orbit.svg | Eclipse geometry and celestial linework |
| assets/scene-shinobi.svg | Racing-circuit linework |
| assets/scene-marvel.svg | Machined-iris geometry and metallic detail |

The vectors layer over the existing photographic backgrounds on verified empty covers. Personal cover photographs remain protected. A single inert CSS pseudo-element also uses the composition behind page content on viewports wider than 1,000px. No labels, mascots, decorative buttons or repeating card stickers are introduced.

The two existing photo-derived light spans remain behind content and animate only opacity and transform. Theme details also include active-navigation paint, primary-button material finishes, stationary identity rims and card focus borders. These additions introduce no DOM tracking, layout measurement or new animation runtime.

## Design references

[Ambilight for YouTube](https://ambilight.noxel.gg/) was inspected in the Codex browser for the way surrounding light ties the viewing area to its environment. The design principle adopted here is controlled continuity of atmosphere between background and interface. Its artwork, code, copy and layout were not copied. The [YouTube Ambient Canvas showcase](https://github.com/REZERV-Amaghini/youtube-ambient-canvas/blob/main/assets/store-screenshot-1280x800.png) was also inspected for the distinction between translucent side content and an opaque settings panel; no code or assets were reused.

## Delivery constraints

Each base environment image is under 350 KiB; each light derivative is under 80 KiB. All nine photographic files together remain under 1 MiB. Image grading and extraction are precomputed. There is no full-page backdrop blur, continuously animated wallpaper or canvas rendering. Light layers use finite browser-managed animation; no scroll/pointer listener, layout measurement, timer or JavaScript animation-frame loop is used. Hidden pages, reduced motion, forced colors and saved settings stop playback. Returning to a visible tab does not restart it.
