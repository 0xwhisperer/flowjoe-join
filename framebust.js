// Clickjacking fallback for hosts that cannot send frame-ancestors (GitHub Pages sends no headers and a <meta> CSP ignores
// frame-ancestors). A classic external script (allowed by script-src 'self'): if the page is framed, blank it before the app loads.
(function () {
  try {
    if (window.top === window.self) return;
  } catch (_) {
    /* a cross-origin top throws: that means we are framed */
  }
  document.documentElement.hidden = true;
  try {
    window.top.location = window.self.location.href;
  } catch (_) {
    /* sandboxed: the page stays hidden */
  }
  throw new Error("framed");
})();
