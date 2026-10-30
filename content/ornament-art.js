/* Original, text-free edge signatures for the four v8 materials. The renderer
 * keeps these below the padded reading area; they never become badges or labels.
 * Every call creates an inert SVG without parsing, IDs, or external resources.
 * Historical settings/variant IDs remain stable for installed extensions. */
(() => {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  function element(name, attributes = {}, children = []) {
    const node = document.createElementNS(NS, name);
    for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
    for (const child of children) node.appendChild(child);
    return node;
  }
  const group = (attributes, children) => element('g', attributes, children);
  const path = (d, attributes = {}) => element('path', { d, ...attributes });
  const ellipse = (cx, cy, rx, ry, attributes = {}) => element('ellipse', { cx, cy, rx, ry, ...attributes });
  const circle = (cx, cy, r, attributes = {}) => element('circle', { cx, cy, r, ...attributes });
  const rect = (x, y, width, height, attributes = {}) => element('rect', { x, y, width, height, ...attributes });

  // One continuous silk fold, expressed through its facing and reverse.
  function ribbonSeal() {
    return [
      path('M38 85C57 80 50 28 80 20C101 14 123 32 113 50C102 67 79 56 71 50C63 45 67 30 78 29C65 44 78 57 91 54C109 51 113 32 98 29C84 26 79 40 73 62C69 79 58 92 38 85Z', { fill: '#9b2757' }),
      path('M70 52C82 64 104 63 118 48C112 73 95 86 77 83C61 81 54 73 46 74C56 69 68 72 78 74C92 78 105 68 108 60C94 66 81 64 70 52Z', { fill: '#d17a9d' }),
      path('M78 28C69 32 64 42 65 51M77 74C88 78 98 74 104 69', { stroke: '#ffd5e5', 'stroke-width': 1.5, 'stroke-linecap': 'round' }),
      path('M30 96H66M96 96H130', { stroke: '#bd7a96', 'stroke-width': 1 }),
      circle(81, 96, 2, { fill: '#9b2757' })
    ];
  }
  function ribbonLine() {
    return [
      path('M24 69C49 70 39 37 64 37C82 37 72 70 96 70C116 70 107 42 137 42', { stroke: '#9b2757', 'stroke-width': 3, 'stroke-linecap': 'round' }),
      path('M24 73C50 75 42 42 64 41M96 74C117 75 110 47 137 46', { stroke: '#d17a9d', 'stroke-width': 1.2 }),
      path('M18 88H142', { stroke: '#bf8b9f', 'stroke-width': .7 }),
      circle(82, 20, 2, { fill: '#9b2757' }),
      path('M74 20H64M90 20H100', { stroke: '#bf8b9f', 'stroke-width': .8 })
    ];
  }
  // Aerofoil sections and machined reference lines. No logos or race numbers.
  function aeroSeal() {
    return [
      path('M21 68C39 28 91 21 143 58C101 44 65 44 21 68Z', { fill: '#c3c8d1' }),
      path('M21 68C58 50 95 48 143 58C103 60 62 66 21 68Z', { fill: '#737d8c' }),
      path('M26 78C70 74 109 68 141 68', { stroke: '#e32636', 'stroke-width': 3, 'stroke-linecap': 'round' }),
      path('M25 91H136M25 88V94M61 89V93M99 89V93M136 88V94', { stroke: '#a3aab5', 'stroke-width': 1 }),
      path('M47 34L52 25M97 32L104 23', { stroke: '#a3aab5', 'stroke-width': 1 })
    ];
  }
  function aeroLine() {
    return [
      path('M18 75C61 75 71 31 142 31', { stroke: '#c3c8d1', 'stroke-width': 1.5 }),
      path('M18 84C64 84 74 40 142 40', { stroke: '#7d8796', 'stroke-width': 1 }),
      path('M18 66C57 66 68 22 142 22', { stroke: '#7d8796', 'stroke-width': 1 }),
      path('M87 58H134L126 68H79Z', { fill: '#e32636' }),
      path('M25 95H137M35 92V98M67 92V98M99 92V98M131 92V98', { stroke: '#a3aab5', 'stroke-width': .8 })
    ];
  }
  // Optical alignments and long orbital arcs, without pictorial planets or stars.
  function opticalSeal() {
    return [
      path('M45 79A39 39 0 1 1 111 79', { stroke: '#a5b4e0', 'stroke-width': 1.2 }),
      path('M53 73A28 28 0 1 1 103 73', { stroke: '#677bb0', 'stroke-width': .8 }),
      ellipse(79, 52, 59, 17, { stroke: '#c1b6ff', 'stroke-width': 1, transform: 'rotate(-22 79 52)' }),
      path('M21 92H137M79 12V20M40 24L45 30M118 24L113 30', { stroke: '#677bb0', 'stroke-width': .8 }),
      circle(78, 52, 2, { fill: '#e1e6ff' })
    ];
  }
  function opticalLine() {
    return [
      path('M19 83C47 22 91 15 143 30', { stroke: '#a5b4e0', 'stroke-width': 1.2 }),
      path('M23 94C48 41 89 30 137 42', { stroke: '#677bb0', 'stroke-width': .8 }),
      path('M35 91C65 55 98 48 139 55', { stroke: '#c1b6ff', 'stroke-width': .8 }),
      circle(101, 23, 3, { fill: '#d4dcff' }),
      path('M20 17H40M30 12V22M120 89H140M130 84V94', { stroke: '#a5b4e0', 'stroke-width': .6 })
    ];
  }
  // Layered alloy seams around a light aperture; no character or insignia.
  function alloySeal() {
    return [
      path('M24 31H69L82 44H136V77H91L78 64H24Z', { fill: '#7e342f' }),
      path('M24 31H69L82 44H136L126 52H78L65 39H24Z', { fill: '#c3a775' }),
      path('M136 77H91L78 64H24L34 56H82L95 69H136Z', { fill: '#a3aebd' }),
      path('M32 45H62L75 58H126', { stroke: '#a8dfff', 'stroke-width': 1.4 }),
      path('M24 86H136M24 83V89M136 83V89', { stroke: '#c3a775', 'stroke-width': .8 }),
      rect(94, 22, 29, 2, { fill: '#c63442' })
    ];
  }
  function alloyLine() {
    return [
      path('M20 39H62L82 62H140', { stroke: '#c3a775', 'stroke-width': 2 }),
      path('M20 49H57L77 72H140', { stroke: '#818d9f', 'stroke-width': 1 }),
      path('M20 60H51L71 83H140', { stroke: '#a8dfff', 'stroke-width': 1.2 }),
      path('M91 28H135L127 35H84Z', { fill: '#c63442' }),
      path('M28 91H55M96 91H133', { stroke: '#c3a775', 'stroke-width': .8 })
    ];
  }
  const art = {
    bloom: { mascot: ribbonSeal, sprig: ribbonLine },
    shinobi: { mascot: aeroSeal, sprig: aeroLine },
    orbit: { mascot: opticalSeal, sprig: opticalLine },
    marvel: { mascot: alloySeal, sprig: alloyLine }
  };
  function create(theme, variant = 'mascot') {
    const selectedTheme = Object.prototype.hasOwnProperty.call(art, theme) ? theme : 'bloom';
    const selectedVariant = variant === 'sprig' ? 'sprig' : 'mascot';
    return element('svg', {
      xmlns: NS, viewBox: '0 0 160 110', width: 160, height: 110,
      class: `aura-ornament-art aura-ornament-art--${selectedTheme} aura-ornament-art--${selectedVariant}`,
      'aria-hidden': 'true', focusable: 'false', role: 'presentation', 'pointer-events': 'none', fill: 'none'
    }, art[selectedTheme][selectedVariant]());
  }
  globalThis.AuraOrnamentArt = Object.freeze({ create });
})();
