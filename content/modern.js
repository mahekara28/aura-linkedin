(function () {
  "use strict";

  if (location.protocol !== 'https:' || !['www.linkedin.com', 'linkedin.com'].includes(location.hostname)) return;

  // SDUI uses generated classes rather than LinkedIn's older semantic tokens.
  // Classify presentation only: no profile text, URLs, or image data are read.
  const popupRoots = 'dialog, [role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"], [role="tooltip"], [popover]';
  const pageRoots = 'main, [role="main"]';
  // These observed renderers sit outside main: LinkedIn's served-ad document
  // and the profile's sticky action toolbar. Neither admits unrelated widgets.
  const auxiliaryRoots = '#react-root > #ads-container, [data-sdui-screen="com.linkedin.sdui.flagshipnav.profile.Profile"] [role="toolbar"]';
  const roots = '[data-testid="primary-nav"], ' + pageRoots + ', ' + popupRoots + ', ' + auxiliaryRoots;
  const topcard = '[id^="com.linkedin.sdui.profile.card"][id$="Topcard"]';
  const profile = topcard + ' > [data-display-contents="true"] > section, ' + topcard + ' > section';
  const excluded = 'svg, img, picture, video, canvas, iframe, object, embed, figure, .aura-scene-overlay, .aura-detail-layer, .aura-world-stage, .aura-world-environment, [contenteditable="true"]';
  const borderSides = ['Top', 'Right', 'Bottom', 'Left'];
  const controlStateAttributes = ['disabled', 'aria-disabled'];
  const stateControls = 'button, input, textarea, select, a[href], [role="button"]';
  const attributes = ['data-aura-modern-surface', 'data-aura-modern-ink', 'data-aura-modern-control', 'data-aura-modern-border', 'data-aura-modern-popup', 'data-aura-modern-ring', 'data-aura-modern-ring-size', 'data-aura-modern-ring-placement', 'data-aura-modern-choice', ...borderSides.map(side => 'data-aura-modern-border-' + side.toLowerCase())];
  const owned = new Map();
  let seen = new WeakSet();
  let islands = new WeakSet();
  let popupShells = new WeakSet();
  let provenSettlementPaints = new WeakSet();
  let observer = null;
  let timer = null;
  let enabled = false;
  const pending = new Map();
  const work = new Map();
  const settlingControls = new Map();

  function transitionMilliseconds(value) {
    const match = /^(-?(?:\d+(?:\.\d+)?|\.\d+))(ms|s)$/.exec(value?.trim() || '');
    return match ? Number(match[1]) * (match[2] === 's' ? 1000 : 1) : 0;
  }

  function cancelControlSettlement(node) {
    if (!settlingControls.has(node)) return;
    clearTimeout(settlingControls.get(node));
    settlingControls.delete(node);
  }

  function settleControlState(node) {
    cancelControlSettlement(node);
    if (!enabled || !node.isConnected || !region(node) || skip(node) || !node.matches('button, a[href], [role="button"]')) return;
    // A newly mounted or enabled action can still be gray at the first 40ms
    // scan. Sample its declared paint timing once, then revisit after it settles.
    // Only the action and its direct span/div paint wrappers are inspected.
    const paints = [node, ...[...(node.children || [])].filter(child => child.matches('span, div') && !skip(child)).slice(0, 16)];
    let delay = 0;
    for (const paint of paints) {
      const style = getComputedStyle(paint);
      const properties = (style.transitionProperty || '').split(',').map(value => value.trim());
      const durations = (style.transitionDuration || '0s').split(',').map(transitionMilliseconds);
      const delays = (style.transitionDelay || '0s').split(',').map(transitionMilliseconds);
      properties.forEach((property, index) => {
        const duration = durations[index % durations.length];
        if (duration > 0 && ['all', 'background', 'background-color', 'box-shadow'].includes(property)) {
          delay = Math.max(delay, duration + delays[index % delays.length]);
        }
      });
    }
    if (delay <= 0) return;
    // Bound both retained controls and unusual third-party transition lengths.
    // This is one mount/state-triggered retry, never a response to Aura's paint.
    if (settlingControls.size >= 64) cancelControlSettlement(settlingControls.keys().next().value);
    const scheduled = setTimeout(() => {
      settlingControls.delete(node);
      if (enabled && node.isConnected && region(node) && !skip(node)) {
        // Snapshot before the pass: a newly recognized accent in the retry
        // still needs its previously neutral descendants reclassified. A
        // disabled action may still look blue in the first frame; its final
        // neutral state must be sampled even if that frame looked proven.
        const disabled = node.matches('[disabled], [aria-disabled="true"]');
        for (const paint of paints) {
          if (!disabled && owned.has(paint) && (paint.getAttribute('data-aura-modern-control') !== null || paint.getAttribute('data-aura-modern-ring') !== null)) provenSettlementPaints.add(paint);
          else provenSettlementPaints.delete(paint);
        }
        queue(node, 'settled');
      }
    }, Math.min(2000, Math.ceil(delay)));
    settlingControls.set(node, scheduled);
  }

  function rgba(value) {
    const match = /^rgba?\(([^)]+)\)$/.exec(value || '');
    if (!match) return null;
    const numbers = match[1].split(/[\s,\/]+/).filter(Boolean).map(Number);
    return numbers.length >= 3 && numbers.every(Number.isFinite) ? [...numbers.slice(0, 3), numbers[3] ?? 1] : null;
  }

  function neutral(color) {
    return color && Math.max(...color.slice(0, 3)) - Math.min(...color.slice(0, 3)) <= 22;
  }

  function blue(color) {
    return color && color[3] >= 0.6 && color[2] > 95 && color[2] - color[0] > 38 && color[1] - color[0] > 22;
  }

  function controlRing(value) {
    // SDUI draws secondary controls with a shadow ring on an inner span.
    // LinkedIn's served-ad Follow link uses the same geometry without inset.
    // Admit only that single, sharp ring; elevations, stacked shadows, inset
    // illustrations and colored status edges must retain their native paint.
    const match = /^(rgba?\([^)]+\))\s+(.+)$/.exec(value || '');
    if (!match) return null;
    const color = rgba(match[1]);
    const parts = match[2].trim().split(/\s+/);
    const inset = parts.includes('inset');
    if (parts.length !== (inset ? 5 : 4) || parts.filter(part => part === 'inset').length > 1) return null;
    const lengths = parts.filter(part => part !== 'inset');
    if (lengths.slice(0, 3).some(part => part !== '0px') || !/^[123]px$/.test(lengths[3]) || color?.[3] < 0.15) return null;
    const role = blue(color) ? 'accent' : neutral(color) ? 'neutral' : null;
    return role ? { role, size: lengths[3].slice(0, -2), placement: inset ? 'inset' : 'outset' } : null;
  }

  function choiceKind(node, style) {
    if (!node.matches('label[for]')) return null;
    const input = node.previousElementSibling;
    const inputId = input?.getAttribute('id');
    if (!input?.matches('input[type="checkbox"], input[type="radio"]') || !inputId || node.getAttribute('for') !== inputId) return null;
    // Notification filters are hidden native inputs paired with visible pills.
    // Never reinterpret ordinary checkbox captions or a member's rich text.
    const bounds = node.getBoundingClientRect();
    const radius = parseFloat(style.borderTopLeftRadius);
    const pill = bounds.height >= 24 && bounds.height <= 48 && bounds.width >= bounds.height && bounds.width <= 360 && radius >= bounds.height * 0.45;
    const compactRadio = input.matches('input[type="radio"]') && node.matches(':empty') && bounds.width >= 16 && bounds.width <= 32 && bounds.height >= 16 && bounds.height <= 32;
    if (!pill && !compactRadio) return null;
    const inputStyle = getComputedStyle(input);
    const inputBounds = input.getBoundingClientRect();
    if (inputStyle.position !== 'absolute' || Number(inputStyle.opacity) !== 0 || inputBounds.width !== 0 || inputBounds.height !== 0) return null;
    if (pill) return 'pill';
    // Audience selectors draw the native radio in an empty label's circular
    // pseudo-element. Verify that geometry; do not admit custom checkboxes or
    // labels containing text/artwork merely because their input is hidden.
    const circle = getComputedStyle(node, '::before');
    const width = parseFloat(circle.width), height = parseFloat(circle.height);
    const curve = parseFloat(circle.borderTopLeftRadius);
    const round = circle.borderTopLeftRadius?.includes('%') ? curve >= 45 : curve >= Math.min(width, height) * 0.45;
    return ['""', "''"].includes(circle.content) && width >= 16 && width <= 28 && Math.abs(width - height) <= 1 && round && (!circle.backgroundImage || circle.backgroundImage === 'none') ? 'radio' : null;
  }

  function directPopup(node) {
    return [...(node?.children || [])].find(child => child.matches(popupRoots));
  }

  function isPopupShell(node) {
    if (!popupShells.has(node)) return false;
    const popup = directPopup(node);
    return Boolean(popup) && ![...node.children].some(child => child !== popup && !child.matches('[aria-hidden="true"]'));
  }

  function popupContext(node) {
    const popup = node.closest?.(popupRoots);
    if (popup) return popup;
    for (let parent = node; parent; parent = parent.parentElement) {
      if (isPopupShell(parent)) return parent;
    }
    return null;
  }

  function region(node) {
    return node.closest?.(roots) || popupContext(node);
  }

  function discoverPopupShell(popup) {
    if (!popup.matches(popupRoots)) return popup;
    const parent = popup.parentElement;
    if (!parent || parent.matches('html, body, [data-testid="primary-nav"], ' + pageRoots + ', ' + popupRoots) || parent.closest(excluded)) return popup;
    if (isPopupShell(parent)) return parent;
    if ([...parent.children].some(child => child !== popup && !child.matches('[aria-hidden="true"]'))) return popup;
    // LinkedIn's Sort menu paints the direct parent of role=menu. Admit only
    // that neutral, similarly sized shell; never sweep arbitrary ancestors.
    const previous = owned.get(parent);
    const current = previous && new Map(attributes.map(name => [name, parent.getAttribute(name)]));
    if (previous) restore(parent, previous);
    const style = getComputedStyle(parent);
    const bg = rgba(style.backgroundColor);
    const image = style.backgroundImage;
    if (current) restore(parent, current);
    if (!neutral(bg) || bg[3] < 0.75 || (image && image !== 'none')) return popup;
    const shellBounds = parent.getBoundingClientRect?.();
    const popupBounds = popup.getBoundingClientRect?.();
    if (shellBounds?.width > 0 && popupBounds?.width > 0 &&
      (shellBounds.width > popupBounds.width + 80 || shellBounds.height > popupBounds.height + 80)) return popup;
    popupShells.add(parent);
    return parent;
  }

  function skip(node) {
    if (node.closest?.('.aura-world-stage, .aura-world-environment')) return true;
    const blocker = node.closest?.(excluded);
    // Neutral UI icons use currentColor, including edit/close controls outside
    // navigation. Preserve SVG paths/fills and colored brand illustrations.
    const uiIcon = blocker === node && node.tagName?.toLowerCase() === 'svg' && node.closest('[data-testid="primary-nav"], button, a, [role="button"], [role="menuitem"], [role="tab"]');
    // Theme the editor shell without recoloring members' rich-text contents.
    const editor = blocker === node && node.matches('[contenteditable="true"][role="textbox"]');
    // Figure artwork stays native, but its semantic caption is readable UI.
    // A nearer image/SVG/editor blocker still protects content in the caption.
    const caption = blocker?.matches('figure') && node.closest('figcaption');
    const captionText = caption && caption.closest('figure') === blocker;
    return Boolean(blocker) && !uiIcon && !editor && !captionText;
  }

  function protectedAncestor(node) {
    for (let parent = node.parentElement; parent; parent = parent.parentElement) {
      if (islands.has(parent)) return true;
      if (parent.matches(roots)) break;
    }
    return false;
  }

  function restore(node, record) {
    for (const [name, value] of record) {
      if (value === null) node.removeAttribute(name);
      else node.setAttribute(name, value);
    }
  }

  function release(node) {
    const record = owned.get(node);
    if (record) restore(node, record);
    owned.delete(node);
    seen.delete(node);
    islands.delete(node);
    provenSettlementPaints.delete(node);
  }

  function classify(node, refresh) {
    if (!node.isConnected || !region(node) || skip(node)) {
      release(node);
      return;
    }
    const firstVisit = !seen.has(node);
    if (!firstVisit && !refresh) return;
    if (refresh === 'settled') {
      // The retry is for unresolved native paint. Removing an already proven
      // accent/ring can start a native transition back from Aura's color; its
      // first frame is our own paint, not evidence of a new colored island.
      // Preserve the proven control and its labels. Real DOM/style/state
      // mutations always use a full refresh and take precedence over this pass.
      for (let paint = node; paint; paint = paint.parentElement) {
        if (owned.has(paint) && provenSettlementPaints.has(paint)) return;
        if (paint.matches('button, a[href], [role="button"]')) break;
      }
    } else provenSettlementPaints.delete(node);
    if (firstVisit && node.matches('button, a[href], [role="button"]')) settleControlState(node);
    seen.add(node);
    // External class/style changes may reuse an element for another purpose.
    // Remove only our markers while reading the new native presentation.
    const previous = owned.get(node);
    if (previous) restore(node, previous);
    owned.delete(node);
    islands.delete(node);
    if (protectedAncestor(node)) return;

    // Card-print wrappers are transparent only while decorated. Read the
    // native paint without that marker so later class changes retain coverage.
    const detailInner = node.getAttribute('data-aura-detail-inner');
    if (detailInner !== null) node.removeAttribute('data-aura-detail-inner');
    const nativeBackground = getComputedStyle(node).backgroundColor;
    if (detailInner !== null) node.setAttribute('data-aura-detail-inner', detailInner);
    const style = getComputedStyle(node);
    if (node.tagName?.toLowerCase() === 'svg') {
      const color = rgba(style.color);
      if (!neutral(color)) return;
      const record = previous || new Map(attributes.map(name => [name, node.getAttribute(name)]));
      owned.set(node, record);
      node.setAttribute('data-aura-modern-ink', node.parentElement?.closest('[data-aura-modern-control="accent"]') ? 'on-accent' : 'text');
      return;
    }
    const bg = rgba(nativeBackground);
    const ink = rgba(style.color);
    const borders = borderSides.map(side => ({
      side: side.toLowerCase(),
      color: rgba(style['border' + side + 'Color']),
      width: parseFloat(style['border' + side + 'Width']) || 0,
      style: style['border' + side + 'Style']
    })).filter(border => border.width > 0 && !['none', 'hidden'].includes(border.style) && border.color?.[3] >= 0.15);
    const image = style.backgroundImage;
    const isHeader = node.matches('[data-testid="primary-nav"]');
    const isProfile = node.getAttribute('data-aura-surface') === 'profile' || node.matches(profile) || node.matches(topcard);
    const isCaption = node.matches('figcaption') && Boolean(node.closest('figure'));
    const popup = popupContext(node);
    const inHeader = Boolean(node.closest('[data-testid="primary-nav"]')) && !popup;
    const choice = choiceKind(node, style);
    const isChoice = Boolean(choice);
    const isControl = isChoice || node.matches('button, input, textarea, select, [role="button"], [contenteditable="true"][role="textbox"]') || (node.matches('a') && (bg?.[3] >= 0.75 || borders.length > 0));
    const controlHost = node.closest('button, a[href], [role="button"]');
    const controlPaint = isControl || controlHost === node || (node.parentElement === controlHost && node.matches('span, div'));
    const ring = controlPaint ? controlRing(style.boxShadow) : null;
    // Header search and expanded/hovered actions receive Aura's dark field
    // before markers exist. Match provenance to the exact semantic host:
    // a child control must not inherit the search wrapper's exemption.
    const navPaint = inHeader && style.getPropertyValue?.('--aura-nav-owned-paint')?.trim();
    const ownedNavPaint = (navPaint === 'action' && controlHost === node) || (navPaint === 'search' && node.matches('[role="search"]'));
    // SDUI sometimes paints a button's inner span while the button itself is transparent.
    const accentControl = !isChoice && !ownedNavPaint && blue(bg) && (isControl || Boolean(node.closest('button, [role="button"]')));
    const specialHost = isHeader || isProfile;

    // Preserve artwork, photographic backgrounds, colored badges, and brand areas.
    if (!specialHost && ((image && image !== 'none') || (bg?.[3] >= 0.75 && !neutral(bg) && !accentControl && !isChoice && !ownedNavPaint) || (isCaption && bg?.[3] > 0 && !neutral(bg)))) {
      islands.add(node);
      return;
    }

    const marks = {};
    const inProfile = Boolean(node.closest('[data-aura-surface="profile"], ' + topcard));
    if (isChoice) marks['data-aura-modern-choice'] = choice;
    if (node.matches(popupRoots) || isPopupShell(node)) marks['data-aura-modern-popup'] = (isPopupShell(node) ? directPopup(node) : node).matches('[role="tooltip"]') ? 'tooltip' : 'panel';
    if (isHeader) marks['data-aura-modern-surface'] = 'header';
    else if (isCaption && (neutral(bg) || bg?.[3] === 0)) marks['data-aura-modern-surface'] = 'inset';
    else if (!isProfile && neutral(bg) && bg[3] >= 0.75) {
      let surface = 'card';
      if (node.matches(pageRoots)) surface = 'canvas';
      else if (node.matches('section[aria-label="Primary content"], aside[aria-label="Aside"], aside[aria-label="Sidebar"]')) surface = 'transparent';
      else if (isControl) surface = 'inset';
      else if (inHeader || inProfile) surface = 'transparent';
      else if (Math.max(...bg.slice(0, 3)) < 235) surface = 'inset';
      marks['data-aura-modern-surface'] = surface;
    }
    if (accentControl) marks['data-aura-modern-control'] = 'accent';
    else if (!isChoice && ((isControl && borders.some(border => blue(border.color))) || ring?.role === 'accent')) marks['data-aura-modern-control'] = 'outline';
    if (ring) {
      marks['data-aura-modern-ring'] = ring.role;
      marks['data-aura-modern-ring-size'] = ring.size;
      marks['data-aura-modern-ring-placement'] = ring.placement;
    }

    if (neutral(ink)) {
      const paired = accentControl || node.parentElement?.closest('[data-aura-modern-control="accent"]');
      if (paired) marks['data-aura-modern-ink'] = 'on-accent';
      // Native white labels on a neutral dark panel must change with the panel.
      // Artwork/colored islands have already exited, including their children.
      else if (Math.max(...ink.slice(0, 3)) < 245 || inHeader || popup || isChoice || marks['data-aura-modern-surface'] || node.parentElement?.closest('[data-aura-modern-surface], [data-aura-modern-choice]')) {
        marks['data-aura-modern-ink'] = ink[3] < 0.75 || (ink[0] > 90 && ink[0] < 205) ? 'muted' : 'text';
      }
    } else if (blue(ink)) marks['data-aura-modern-ink'] = 'accent';
    for (const border of borders) {
      border.role = neutral(border.color) ? 'neutral' : isControl && blue(border.color) ? 'accent' : null;
      if (border.role) marks['data-aura-modern-border-' + border.side] = border.role;
    }
    // The aggregate marker remains useful to existing component rules, but a
    // mixed semantic border must never have all its edge colors overwritten.
    if (borders.length && borders.every(border => border.role && border.role === borders[0].role)) marks['data-aura-modern-border'] = borders[0].role;

    if (!Object.keys(marks).length) return;
    const record = previous || new Map(attributes.map(name => [name, node.getAttribute(name)]));
    owned.set(node, record);
    for (const [name, value] of Object.entries(marks)) node.setAttribute(name, value);
  }

  function schedule() {
    if (timer === null && enabled) timer = setTimeout(flush, 40);
  }

  function mergeRefresh(next, previous) {
    return next === true || previous === true ? true : next || previous || false;
  }

  function queue(node, refresh = false) {
    if (node?.nodeType !== 1) return;
    if (skip(node)) {
      // A featured item may arrive as a whole figure after the initial scan.
      if (node.matches('figure')) node.querySelectorAll('figcaption').forEach(caption => queue(caption, refresh));
      return;
    }
    pending.set(node, mergeRefresh(refresh, pending.get(node)));
    schedule();
  }

  function coalesce(scopes) {
    const result = new Map();
    for (const [node, refresh] of scopes) {
      if (!node.isConnected) continue;
      let outer = node;
      for (let parent = node.parentElement; parent; parent = parent.parentElement) {
        if (scopes.has(parent)) outer = parent;
      }
      result.set(outer, mergeRefresh(refresh, result.get(outer)));
    }
    return result;
  }

  function stage(node, refresh) {
    const nextRefresh = mergeRefresh(refresh, work.get(node));
    // Restaging a parent with its descendants retains parent-first evaluation,
    // even when a previous long batch was interrupted by another mutation.
    work.delete(node);
    work.set(node, nextRefresh);
  }

  function flush() {
    timer = null;
    if (!enabled) return;
    for (const node of settlingControls.keys()) if (!node.isConnected || !region(node) || skip(node)) cancelControlSettlement(node);
    for (const node of owned.keys()) if (!node.isConnected || !region(node) || skip(node) || protectedAncestor(node)) release(node);
    const scopes = new Map();
    for (const [node, refresh] of coalesce(pending)) {
      // An insertion outside the app may contain a newly mounted SDUI root.
      const matches = region(node) ? [node] : [...node.querySelectorAll(roots)];
      for (const match of matches) {
        const scope = discoverPopupShell(match);
        scopes.set(scope, mergeRefresh(refresh, scopes.get(scope)));
      }
    }
    pending.clear();
    for (const [scope, refresh] of coalesce(scopes)) {
      stage(scope, refresh);
      for (const child of scope.querySelectorAll('*')) {
        discoverPopupShell(child);
        stage(child, refresh);
      }
    }
    // Keep long profiles responsive; subsequent frames finish the same batch.
    let remaining = 350;
    for (const [node, refresh] of work) {
      work.delete(node);
      classify(node, refresh);
      if (--remaining === 0) break;
    }
    if (work.size || pending.size) schedule();
  }

  function start() {
    if (!document.body || observer || !globalThis.MutationObserver) return;
    observer = new MutationObserver(records => {
      let removed = false;
      for (const change of records) {
        if (skip(change.target) && !change.target.matches('figure')) continue;
        if (change.type === 'attributes') {
          // Composer actions can enable by changing only disabled/aria-disabled.
          // Their inner paint spans then change through native CSS. Refresh the
          // semantic control and its descendants, but ignore unrelated widgets
          // using the same attributes on non-control containers.
          if (controlStateAttributes.includes(change.attributeName)) {
            if (!change.target.matches(stateControls)) continue;
            settleControlState(change.target);
          }
          // An input can be reused with a new association or visible checkbox
          // treatment. Revalidate only its immediately paired label as well.
          if (change.target.matches('input') && change.target.nextElementSibling?.matches('label[for]')) queue(change.target.nextElementSibling, true);
          // A shell's class/style may affect inherited paint inside the app;
          // a role or id change may also introduce or remove an entire root.
          // flush still limits traversal to the semantic regions above.
          queue(change.target, true);
          if (popupShells.has(change.target.parentElement)) queue(change.target.parentElement, true);
          continue;
        }
        // Insertions include nodes moved between native/artwork contexts. Read
        // their original paint again instead of retaining stale seen markers.
        for (const node of change.addedNodes) queue(node, true);
        if (change.target.matches('label[data-aura-modern-choice]')) queue(change.target, true);
        if ([...change.addedNodes, ...change.removedNodes].some(node => node.nodeType === 1 && node.matches('input'))) {
          for (const child of change.target.children) if (child.matches('label[for]')) queue(child, true);
        }
        if (popupShells.has(change.target)) queue(change.target, true);
        if (change.removedNodes.length) removed = true;
      }
      if (removed) schedule();
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style', 'role', 'id', 'for', 'type', 'data-testid', 'data-sdui-screen', ...controlStateAttributes] });
  }

  function stop() {
    enabled = false;
    observer?.disconnect();
    observer = null;
    if (timer !== null) clearTimeout(timer);
    timer = null;
    pending.clear();
    work.clear();
    for (const node of settlingControls.keys()) cancelControlSettlement(node);
    for (const node of owned.keys()) release(node);
    seen = new WeakSet();
    islands = new WeakSet();
    popupShells = new WeakSet();
    provenSettlementPaints = new WeakSet();
  }

  globalThis.AuraModern = Object.freeze({
    apply(settings) {
      if (!settings.enabled) { stop(); return; }
      const first = !enabled;
      const started = Boolean(observer);
      enabled = true;
      start();
      // Classification is retained across palette/motion changes. Reading our
      // own themed colors here would gradually erase the compatibility markers.
      if (first || !started) document.querySelectorAll(roots).forEach(node => queue(node));
    },
    stop
  });
})();
