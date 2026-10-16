/* Runs in <head>, before the dashboard script. Asks the local server who is signed in (a synchronous call to
   127.0.0.1 so the dashboard never paints or loads anyone's data before the login check finishes). */
(function () {
  'use strict';
  var A = { authed: false, needsSetup: false, offline: true };
  try {
    var x = new XMLHttpRequest();
    x.open('GET', '/api/auth/session', false);
    x.send();
    if (x.status === 200) { A = JSON.parse(x.responseText); A.offline = false; }
  } catch (e) { /* server unreachable: stay locked */ }
  window.TJ_AUTH = A;
  try {
    var raw = localStorage.getItem('tj_state');
    if (A.authed && A.user) {
      window.TJ_USER_ID = A.user.id;
      localStorage.setItem('tj_state', JSON.stringify(A.state || {}));
      // Chart screenshots live in this browser profile; give the owner the ones saved before accounts existed.
      var key = 'tj_dj_imgs_' + A.user.id;
      if (A.user.admin && localStorage.getItem('tj_dj_imgs') && !localStorage.getItem(key)) {
        localStorage.setItem(key, localStorage.getItem('tj_dj_imgs'));
        localStorage.removeItem('tj_dj_imgs');
      }
    } else {
      // Nobody is signed in: keep whatever was there as a backup for the first account, then clear the working copy.
      if (raw && !localStorage.getItem('tj_legacy_state')) localStorage.setItem('tj_legacy_state', raw);
      localStorage.removeItem('tj_state');
      document.documentElement.classList.add('auth-locked');
    }
  } catch (e) { document.documentElement.classList.add('auth-locked'); }
  // desktop app: show the sign-in screen in its own fixed-size window, the dashboard maximized
  try { if (window.tjDesktop && typeof window.tjDesktop.setLoginMode === 'function') window.tjDesktop.setLoginMode(!A.authed); } catch (e) { /* ignore */ }
})();
