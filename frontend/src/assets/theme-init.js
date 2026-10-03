/*
 * Applies the saved colour theme before the first paint so the page never flashes the
 * wrong theme. Kept as an external file (not inline) so a strict Content-Security-Policy
 * can forbid inline scripts. Must stay in sync with core/theme/theme.util.ts.
 */
(function () {
  var mode = 'system';
  try {
    var saved = window.localStorage.getItem('ichnos.theme');
    if (saved === 'light' || saved === 'dark' || saved === 'system') mode = saved;
  } catch (e) {
    /* storage blocked: follow the device */
  }
  var dark = mode === 'dark' || (mode === 'system' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.setAttribute('data-theme', dark ? 'ichnos-dark' : 'ichnos-light');
})();
