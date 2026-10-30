# Aura — LinkedIn appearance

Version **8.3.0** refines four themes for people who want a more considered LinkedIn workspace. The design emphasizes readable surfaces, useful controls and photographic atmosphere. Theme names belong in the chooser; no names, edition numbers or decorative text are added to LinkedIn.

| Theme | Design direction | Saved ID |
| --- | --- | --- |
| **Girly Pop Pink** | Blush satin photography, rose accents and editorial identity typography. | `bloom` |
| **Cosmic / Space** | Hubble galaxy photography, midnight navy and restrained violet/silver accents. | `orbit` |
| **F1 / Motorsport Luxury** | Graded racing photography, carbon surfaces and precise red/silver accents. | `shinobi` |
| **Marvel-inspired** | Photographed alloy, deep shadows and warm metallic light; no official character imagery. | `marvel` |

Exactly four choices are available. Existing saved IDs and preference migrations remain compatible. `shinobi` is an internal compatibility key, not a visible theme name.

## Install or update

1. Extract `aura-linkedin.zip`.
2. Open `chrome://extensions` and enable **Developer mode**.
3. Choose **Load unpacked**, then select the folder containing `manifest.json`.
4. Refresh LinkedIn and choose a theme in Aura.

For an existing installation, replace the files in the folder already loaded by that browser, click **Reload** on Aura's extension card, then refresh its LinkedIn tabs. The picker should show **v8.3.0**. Opening the local studio or updating another browser's copy does not reload the installed content scripts.

## Controls

- **Theme on:** apply or pause the complete theme.
- **Signature details:** enable photography and surface finishes. Turning this off retains an opaque component palette.
- **Cinematic motion:** enable finite photographic light effects and brief control feedback. System reduced-motion and forced-color settings take priority.
- **Preview & settings:** compare fictional feed and profile samples using the production styles. The preview cannot post to LinkedIn.

The extension saves preferences in Chrome local storage. A standalone studio uses separate local browser storage and does not control a separately installed extension.

## What changed in 8.3

Each theme now has an original, text-free composition: folded-petal forms for Pink, eclipse geometry for Cosmic, circuit linework for F1, and a machined iris for Marvel-inspired. Transparent artwork sits over photography on verified empty covers. A single desktop background detail appears behind content, without adding controls or labels. Existing personal cover photos remain intact.

Active navigation uses a distinct painted indicator. Primary buttons have refined material finishes on hover and keyboard focus; identity panels have a stationary rim, and focused cards gain a border without lifting or resizing. These details preserve LinkedIn's typography hierarchy, control geometry and readable surfaces.

The existing cinematic light effects remain finite: arrivals last 1.9–4.4 seconds, and eligible navigation/tab responses last 1.4 seconds with a nine-second cooldown. Two inert light layers animate behind content while the photo stays still. Motion respects disabled settings, hidden pages, reduced motion and forced colors. There are no scroll/pointer trackers, JavaScript frame loops or timers; Replay stays inside the local studio.

The direct-menu shadow fix and exact LinkedIn `/preload/` full-app frame exception remain included. Both have local regression coverage and still require an installed live retest.

## Privacy and compatibility

Aura uses Manifest V3 and requests **storage permission only**. Content scripts run on the two LinkedIn HTTPS hosts. Assets are packaged locally; there are no analytics, remote scripts, externally hosted fonts or photo-service requests.

LinkedIn can change its markup or serve different interface experiments. The adapter targets observed structures. A local test pass does not prove every live LinkedIn surface. Aura is an independent customization project, with no claimed endorsement by LinkedIn, Formula 1 or Marvel.

## Verification

**173/173 source/runtime tests** and **632/632 local browser component/motion checks** pass, with a minimum tested primary-button material contrast of **5.31:1**. Feed and profile previews were visually reviewed in all four themes, including Pink's final asymmetric folded-petal artwork.

The current installed LinkedIn document reports **v8.1.0 Cosmic**. The browser tool cannot operate the installed picker or extension-management page, so a manual reload to **v8.3.0** and independent live checks of all four themes remain necessary. Hover-only pointer interactions were unavailable.

See [AUDIT.md](AUDIT.md) for exact coverage and limits, and [ASSETS.md](ASSETS.md) for image provenance. These refinements are a design direction, not a claim of market validation.

After changing `content/themes.css`, regenerate `content/shadow.css` with `node scripts/build-shadow.cjs`; use `--check` to verify freshness.
