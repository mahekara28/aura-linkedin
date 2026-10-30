(() => {
  'use strict';
  // The studio uses the same stylesheet and settings as the extension on sample content.
  // The production content script deliberately runs only on LinkedIn, never this demo.
  function render(settings) {
    const root = document.documentElement;
    if (settings.enabled) {
      root.dataset.auraTheme = settings.theme;
      root.dataset.auraDecorations = settings.decorations ? 'on' : 'off';
      root.dataset.auraMotion = settings.motion !== false ? 'on' : 'off';
      root.dataset.auraVisible = document.visibilityState === 'hidden' ? 'false' : 'true';
    } else {
      delete root.dataset.auraTheme;
      delete root.dataset.auraDecorations;
      delete root.dataset.auraMotion;
      delete root.dataset.auraVisible;
    }
    globalThis.AuraDetails?.apply(settings);
    globalThis.AuraWorld?.apply(settings);
  }
  let revision = 0;
  // Explicit parent updates also support previews opened directly from file://.
  window.addEventListener('message', event => {
    if (event.source !== window.parent || window.parent === window) return;
    if (event.data?.type === 'aura:preview-settings') {
      revision++;
      render(AuraSettings.normalize(event.data.settings));
      return;
    }
    if (event.data?.type === 'aura:preview-replay-motion') {
      let played = false;
      try { played = globalThis.AuraWorld?.replay?.() === true; }
      catch (error) { console.warn('Aura could not replay preview motion.', error); }
      window.parent.postMessage({ type: 'aura:preview-motion-result', played }, '*');
    }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.documentElement.dataset.auraTheme) {
      document.documentElement.dataset.auraVisible = document.visibilityState === 'hidden' ? 'false' : 'true';
    }
  });
  AuraSettings.subscribe(settings => { revision++; render(settings); });
  const initialRevision = revision;
  AuraSettings.read().then(settings => {
    if (revision === initialRevision) render(settings);
  }).catch(() => {});
  if (window.parent !== window) {
    window.parent.postMessage({ type: 'aura:preview-ready' }, '*');
    window.parent.postMessage({ type: 'aura:preview-page', view: location.pathname.endsWith('/profile.html') ? 'profile' : 'feed' }, '*');
  }

  // Decorative elements match the live extension. The sample cover is deliberately
  // empty; real profile photographs are never replaced by the extension.
  document.querySelectorAll('[data-aura-surface]').forEach(host => {
    const placement = host.dataset.auraSurface;
    const overlay = document.createElement('div');
    overlay.className = 'aura-scene-overlay';
    overlay.dataset.auraPlacement = placement;
    overlay.setAttribute('aria-hidden', 'true');
    ['aura-scene-art'].forEach(className => {
      const part = document.createElement('span');
      part.className = className;
      overlay.append(part);
    });
    const cover = placement === 'profile' ? host.querySelector('[data-aura-cover]') : null;
    (cover || host).append(overlay);
  });

  const connect = document.getElementById('connect-button');
  connect?.addEventListener('click', () => {
    const connected = connect.getAttribute('aria-pressed') !== 'true';
    connect.setAttribute('aria-pressed', String(connected));
    connect.textContent = connected ? '✓ Connected' : '+ Connect';
    document.getElementById('connection-status').textContent = connected ? 'Connected in this preview. No invitation was sent.' : 'Preview only. No invitation is sent.';
  });
  const moreAbout = document.getElementById('about-toggle');
  moreAbout?.addEventListener('click', () => {
    const expanded = moreAbout.getAttribute('aria-expanded') !== 'true';
    moreAbout.setAttribute('aria-expanded', String(expanded));
    moreAbout.textContent = expanded ? 'Show less' : 'Read more';
    document.getElementById('about-more').hidden = !expanded;
  });
  const messageDialog = document.getElementById('message-dialog');
  document.getElementById('message-button')?.addEventListener('click', () => messageDialog.showModal());
  document.getElementById('close-message')?.addEventListener('click', () => messageDialog.close());
  document.getElementById('message-form')?.addEventListener('submit', event => {
    event.preventDefault();
    const text = document.getElementById('message-text');
    if (!text.value.trim()) return;
    document.getElementById('message-status').textContent = 'Sample message saved in this preview. Nothing was sent.';
    text.value = '';
    messageDialog.close();
  });

  const like = document.getElementById('like-button');
  like?.addEventListener('click', () => {
    const pressed = like.getAttribute('aria-pressed') !== 'true';
    like.setAttribute('aria-pressed', String(pressed));
    like.querySelector('span').textContent = pressed ? 'Liked' : 'Like';
    document.getElementById('reaction-count').textContent = pressed ? '1' : '0';
  });
  const comments = document.getElementById('comment-form');
  document.getElementById('comment-button')?.addEventListener('click', () => {
    comments.hidden = !comments.hidden;
    if (!comments.hidden) document.getElementById('comment-input').focus();
  });
  comments?.addEventListener('submit', event => {
    event.preventDefault();
    const input = document.getElementById('comment-input');
    if (!input.value.trim()) return;
    const comment = document.createElement('p');
    comment.textContent = 'You (preview): ' + input.value.trim();
    document.getElementById('comments').append(comment);
    const count = document.getElementById('comment-count');
    if (count) count.textContent = String(document.getElementById('comments').childElementCount);
    input.value = '';
  });
  const composer = document.getElementById('compose-dialog');
  document.getElementById('compose-button')?.addEventListener('click', () => composer.showModal());
  document.getElementById('close-compose')?.addEventListener('click', () => composer.close());
  document.getElementById('compose-form')?.addEventListener('submit', event => {
    event.preventDefault();
    const input = document.getElementById('post-text');
    if (!input.value.trim()) return;
    const article = document.createElement('article');
    article.className = 'artdeco-card sample-new-post';
    const title = document.createElement('strong');
    title.textContent = 'You · preview';
    const body = document.createElement('p');
    body.textContent = input.value.trim();
    const note = document.createElement('small');
    note.className = 't-black--light';
    note.textContent = 'Sample content. This is not posted to LinkedIn.';
    article.append(title, body, note);
    document.querySelector('.post').before(article);
    input.value = '';
    composer.close();
  });
})();
