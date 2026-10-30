/* Aura's original optical overlays are passive SVG trees: no IDs, references,
 * filters, scripts, visible labels or external resources. Photography is supplied
 * by the scoped --aura-environment-image property; motion belongs to world.css. */
(() => {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const el = (name, attributes = {}, children = []) => {
    const node = document.createElementNS(NS, name);
    for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
    for (const child of children) node.appendChild(child);
    return node;
  };
  const g = (attributes, children) => el('g', attributes, children);
  const p = (d, attributes = {}) => el('path', { d, ...attributes });
  const c = (cx, cy, r, attributes = {}) => el('circle', { cx, cy, r, ...attributes });
  const e = (cx, cy, rx, ry, attributes = {}) => el('ellipse', { cx, cy, rx, ry, ...attributes });

  function frame(stroke, opacity = .3) {
    return g({ class: 'aura-world-detail', fill: 'none', stroke, 'stroke-width': .6, opacity }, [
      p('M18 52V35H40'), p('M320 35H342V52'),
      p('M18 148V165H40'), p('M320 165H342V148'),
      p('M18 73V127'), p('M342 73V127'),
      p('M64 35H96'), p('M264 165H296')
    ]);
  }

  function atelier() {
    return [
      // Long, open pleat contours follow the photographic fabric rather than
      // introducing a second object, bow or mascot into the interface.
      g({ class: 'aura-world-primary aura-atelier-material', fill: 'none' }, [
        g({ class: 'aura-world-fold-left' }, [
          p('M-20 151C57 164 109 56 201 48C251 44 283 76 380 45', { stroke: '#fff9f5', 'stroke-width': 1.5, opacity: .58 }),
          p('M-20 158C58 171 111 64 202 56C252 52 288 85 380 53', { stroke: '#873950', 'stroke-width': .8, opacity: .4 }),
          p('M-20 165C58 176 115 72 206 65C257 61 291 93 380 63', { stroke: '#fff9f5', 'stroke-width': .7, opacity: .13 }),
          p('M-20 175C60 183 117 82 210 76C260 73 294 102 380 75', { stroke: '#aa4c70', 'stroke-width': .45, opacity: .09 })
        ]),
        g({ class: 'aura-world-fold-right' }, [
          p('M65 214C123 158 165 145 224 154C288 164 319 141 379 121', { stroke: '#fff9f5', 'stroke-width': 1.3, opacity: .5 }),
          p('M74 214C130 165 171 155 226 161C289 170 324 148 380 130', { stroke: '#873950', 'stroke-width': .8, opacity: .34 }),
          p('M90 214C140 173 179 165 232 170C292 177 326 158 380 143', { stroke: '#fff9f5', 'stroke-width': .7, opacity: .14 }),
          p('M106 214C150 182 186 176 238 180C297 184 332 169 380 158', { stroke: '#aa4c70', 'stroke-width': .45, opacity: .09 })
        ])
      ]),
      g({ class: 'aura-world-secondary', fill: 'none', stroke: '#fff7ee', 'stroke-width': .6, opacity: .28 }, [
        p('M34 113C91 109 133 57 192 44'), p('M246 178C286 183 316 172 338 165')
      ]),
      frame('#70334e', .32),
      g({ class: 'aura-world-reaction', fill: 'none', stroke: '#fffdf9', 'stroke-width': .9 }, [
        p('M27 143C94 136 130 53 210 51C259 49 289 76 332 65'),
        p('M111 189C155 154 187 151 234 160C270 165 298 159 326 148')
      ])
    ];
  }

  function motorsport() {
    return [
      g({ class: 'aura-world-primary aura-motorsport-optics', fill: 'none' }, [
        p('M-12 139C80 137 122 73 205 72C272 71 311 96 374 69', { stroke: '#ff6770', 'stroke-width': 1.75, opacity: .65 }),
        p('M-12 145C80 143 122 81 205 80C272 79 311 104 374 77', { stroke: '#eceef2', 'stroke-width': .8, opacity: .55 }),
        p('M-12 151C80 149 122 89 205 88C272 87 311 112 374 85', { stroke: '#7a8796', 'stroke-width': .5, opacity: .2 }),
        p('M-12 159C80 157 122 99 205 98C272 97 311 122 374 95', { stroke: '#b3bcc7', 'stroke-width': .45, opacity: .12 })
      ]),
      g({ class: 'aura-world-secondary', fill: 'none', stroke: '#c5ccd5', 'stroke-width': .65, opacity: .4 }, [
        p('M52 151H308'), p('M52 146V156M80 148V154M108 148V154M136 146V156'),
        p('M164 148V154M192 148V154M220 146V156M248 148V154M276 148V154M308 146V156'),
        p('M52 49H101M278 49H308')
      ]),
      frame('#c7cdd5', .34),
      g({ class: 'aura-world-detail', fill: '#ed4855', opacity: .6 }, [c(54, 40, 1.2), c(60, 40, 1.2), c(66, 40, 1.2)]),
      g({ class: 'aura-world-reaction', fill: 'none', stroke: '#f4f5f7', 'stroke-width': .8 }, [
        p('M28 126C95 113 136 63 205 63C263 62 299 80 332 70'),
        p('M28 137C95 123 136 74 205 74C263 73 299 91 332 81', { opacity: .45 })
      ])
    ];
  }

  function cosmic() {
    return [
      g({ class: 'aura-world-primary aura-cosmic-corona', fill: 'none', opacity: .5 }, [
        e(186, 101, 117, 47, { stroke: '#c8bdec', 'stroke-width': .85, transform: 'rotate(-22 186 101)' }),
        e(186, 101, 108, 41, { stroke: '#8f7fc1', 'stroke-width': .45, opacity: .5, transform: 'rotate(-22 186 101)' }),
        g({ class: 'aura-world-fold-left' }, [
          p('M80 110C96 81 126 61 160 51', { stroke: '#ddd9ed', 'stroke-width': .55 }),
          p('M75 108C91 77 124 55 157 46', { stroke: '#8375b8', 'stroke-width': .65, opacity: .5 })
        ]),
        g({ class: 'aura-world-fold-right' }, [
          p('M219 147C251 136 282 111 295 84', { stroke: '#cbc2e8', 'stroke-width': .55 }),
          p('M224 152C260 139 289 114 300 85', { stroke: '#8375b8', 'stroke-width': .65, opacity: .5 })
        ])
      ]),
      g({ class: 'aura-world-secondary', fill: 'none', stroke: '#c8d2eb', 'stroke-width': .45, opacity: .25 }, [
        p('M24 71H30M24 100H30M24 129H30'), p('M330 71H336M330 100H336M330 129H336'),
        p('M175 35H185M180 30V40'), p('M175 165H185M180 160V170')
      ]),
      frame('#c8d2eb', .32),
      g({ class: 'aura-world-reaction', fill: 'none', stroke: '#e8e3f8', 'stroke-width': .7 }, [
        p('M65 106C91 55 207 12 281 56'), p('M107 155C169 177 258 142 298 91')
      ])
    ];
  }

  function marvel() {
    return [
      // An original precision aperture. These open construction lines do not
      // reproduce a character, emblem, franchise prop or logo.
      g({ class: 'aura-world-primary aura-marvel-aperture', fill: 'none' }, [
        p('M180 52L222 76V124L180 148L138 124V76Z', { stroke: '#dfbb79', 'stroke-width': .9, opacity: .55 }),
        p('M180 62L213 81V119L180 138L147 119V81Z', { stroke: '#a8dfff', 'stroke-width': .85, opacity: .6 }),
        p('M180 73L203 86V114L180 127L157 114V86Z', { stroke: '#d9eaf3', 'stroke-width': .45, opacity: .18 }),
        c(180, 100, 21, { stroke: '#a8dfff', 'stroke-width': .75, opacity: .46 }),
        p('M180 52V62M222 76L213 81M222 124L213 119M180 148V138M138 124L147 119M138 76L147 81', { stroke: '#e1c289', 'stroke-width': .8, opacity: .25 }),
        p('M166 86L172 92M194 86L188 92M180 120V112', { stroke: '#cde9fa', 'stroke-width': .55, opacity: .28 })
      ]),
      g({ class: 'aura-world-secondary', fill: 'none', stroke: '#d4b27d', 'stroke-width': .65, opacity: .5 }, [
        p('M40 65H94L113 84H134'), p('M226 116H247L266 135H320'),
        p('M40 135H77M283 65H320'), p('M62 132V138M302 62V68')
      ]),
      frame('#a7c5da', .32),
      g({ class: 'aura-world-detail', fill: '#b8e9ff', opacity: .45 }, [c(108, 79, .85), c(252, 121, .85), c(180, 100, 1)]),
      g({ class: 'aura-world-reaction', fill: 'none', stroke: '#e4f4fc', 'stroke-width': .75 }, [
        p('M180 46L228 73V127L180 154L132 127V73Z'), p('M43 157H92M268 43H317')
      ])
    ];
  }

  function create(theme) {
    const draw = theme === 'shinobi' ? motorsport : theme === 'orbit' ? cosmic : theme === 'marvel' ? marvel : atelier;
    return el('svg', {
      xmlns: NS, viewBox: '0 0 360 200', width: '360', height: '200', fill: 'none', preserveAspectRatio: 'xMidYMid slice',
      'aria-hidden': 'true', focusable: 'false', class: 'aura-world-illustration'
    }, draw());
  }
  globalThis.AuraWorldArt = Object.freeze({ create });
})();
