(function () {
  var script = document.currentScript;
  if (!script) return;
  var token = script.getAttribute('data-token');
  if (!token) {
    console.error('[chat-widget] missing data-token');
    return;
  }
  var origin = new URL(script.src).origin;
  var iframe = document.createElement('iframe');
  iframe.src = origin + '/widget/v1?token=' + encodeURIComponent(token);
  iframe.style.cssText = [
    'position:fixed', 'bottom:20px', 'right:20px', 'width:380px', 'height:600px',
    'border:0', 'border-radius:12px', 'box-shadow:0 8px 32px rgba(0,0,0,0.18)',
    'z-index:2147483646', 'background:transparent', 'max-width:calc(100vw - 40px)',
    'max-height:calc(100vh - 40px)'
  ].join(';');
  iframe.title = 'Chat';
  iframe.allow = 'clipboard-write';
  document.body.appendChild(iframe);
})();
