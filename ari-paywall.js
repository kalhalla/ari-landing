/* Ari paywall
   A soft, client-side wall: the first few machines a family plays are free,
   then a grown-up is asked to join. It stays switched OFF until both Stripe
   links below are filled in, so the site behaves exactly as before until then.

   To switch it on:
   1. Create two Stripe Payment Links and paste them below.
   2. In each link's "After payment" setting, redirect to:
      https://learnwithari.co.uk/welcome.html?key=<unlockKey>
   Preview it without Stripe by adding ?paywall=test to any machine URL.

   This is not real access control. The key lives in this file, so anyone
   determined can get past it. It is enough to find the first paying families;
   replace it with proper accounts once someone has paid.
*/
(function () {
  'use strict';

  var CONFIG = {
    monthlyLink: '',            // Stripe Payment Link: £5 a month
    lifetimeLink: '',           // Stripe Payment Link: £49 once (limit it to 50 payments in Stripe)
    monthlyPrice: '£5',
    lifetimePrice: '£49',
    lifetimeCap: 50,
    freeMachines: 3,
    unlockKey: 'ari-founding-2026'
  };

  // Machines that count towards the free allowance. The jet engine is the
  // home page and always stays free. `topic` is the matching topic in the
  // national curriculum for science in England.
  var MACHINES = {
    drone:   { name: 'the drone',        topic: 'Year 5 · Forces' },
    f1:      { name: 'the F1 car',       topic: 'Year 5 · Forces' },
    rocket:  { name: 'the rocket',       topic: 'Year 5 · Forces' },
    orbit:   { name: 'the satellite',    topic: 'Year 5 · Earth and space' },
    toilet:  { name: 'the toilet',       topic: 'Year 5 · Forces' },
    solar:   { name: 'the solar panel',  topic: 'Year 6 · Electricity' },
    speaker: { name: 'the speaker',      topic: 'Year 4 · Sound' },
    touch:   { name: 'the touchscreen',  topic: 'Year 4 · Electricity' },
    heart:   { name: 'the heart',        topic: 'Year 6 · Animals, including humans' }
  };
  var TOTAL = Object.keys(MACHINES).length + 1; // plus the jet engine

  var store = {
    get: function (k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { window.localStorage.setItem(k, v); } catch (e) {} }
  };

  var params = new URLSearchParams(window.location.search);
  var testMode = params.get('paywall') === 'test';
  var configured = !!(CONFIG.monthlyLink && CONFIG.lifetimeLink);

  function isMember() { return store.get('ari_member') === '1'; }

  function played() {
    try { var a = JSON.parse(store.get('ari_played') || '[]'); return Array.isArray(a) ? a : []; }
    catch (e) { return []; }
  }

  function machineId() {
    var m = window.location.pathname.match(/\/([a-z0-9-]+?)(?:\.html)?\/?$/i);
    var id = m ? m[1].toLowerCase() : '';
    return MACHINES[id] ? id : null;
  }

  function track(name, data) {
    try { if (typeof window.va === 'function') window.va('event', { name: name, data: data || {} }); } catch (e) {}
  }

  function payLink(base, id) {
    if (!base) return '#';
    return base + (base.indexOf('?') === -1 ? '?' : '&') + 'client_reference_id=wall_' + (id || 'join');
  }

  // Public hooks for welcome.html and join.html
  window.AriPaywall = {
    config: CONFIG,
    machines: MACHINES,
    total: TOTAL,
    isMember: isMember,
    payLink: payLink,
    unlock: function (key) {
      if (key && key === CONFIG.unlockKey) { store.set('ari_member', '1'); return true; }
      return false;
    }
  };

  var id = machineId();
  if (!id) return;                         // not a metered machine page
  if (!configured && !testMode) return;    // wall is switched off
  if (isMember()) return;

  var list = played();
  if (list.indexOf(id) !== -1) return;     // already one of their free machines

  if (list.length < CONFIG.freeMachines) {
    // Spend a free play only once the child actually touches the machine.
    var spend = function () {
      var now = played();
      if (now.indexOf(id) === -1) { now.push(id); store.set('ari_played', JSON.stringify(now)); }
      window.removeEventListener('pointerdown', spend, true);
    };
    window.addEventListener('pointerdown', spend, true);
    return;
  }

  showWall(id);

  function showWall(id) {
    var m = MACHINES[id];
    var css =
      '.ariw-back{position:fixed;inset:0;z-index:2147483000;background:rgba(40,28,22,.62);backdrop-filter:blur(7px);-webkit-backdrop-filter:blur(7px);display:flex;align-items:flex-end;justify-content:center;padding:0;font-family:Nunito,system-ui,sans-serif}' +
      '@media(min-width:620px){.ariw-back{align-items:center;padding:20px}}' +
      '.ariw{background:#FFF8F3;color:#4A3229;width:100%;max-width:480px;max-height:92vh;overflow:auto;border-radius:26px 26px 0 0;padding:22px 20px calc(20px + env(safe-area-inset-bottom));box-shadow:0 -10px 50px rgba(0,0,0,.3)}' +
      '@media(min-width:620px){.ariw{border-radius:26px}}' +
      '.ariw-eye{font:600 12px/1 "IBM Plex Mono",ui-monospace,monospace;letter-spacing:.08em;text-transform:uppercase;color:#E8622C}' +
      '.ariw h2{font-family:Fredoka,Nunito,sans-serif;font-weight:700;font-size:27px;line-height:1.1;margin:8px 0 8px}' +
      '.ariw p{font-size:16px;line-height:1.45;color:#6B5248;margin:0 0 10px}' +
      '.ariw p b{color:#4A3229}' +
      '.ariw-topic{display:inline-block;font:600 12px/1 "IBM Plex Mono",ui-monospace,monospace;background:#FFE8D6;color:#4A3229;border-radius:999px;padding:7px 11px;margin:0 0 12px}' +
      '.ariw-opt{display:block;text-decoration:none;border-radius:18px;padding:14px 16px;margin-top:10px;border:2px solid #4A3229;color:#4A3229;background:#fff}' +
      '.ariw-opt.main{background:#FF8C42;border-color:#E8622C;color:#fff;box-shadow:0 4px 0 #E8622C}' +
      '.ariw-opt strong{display:block;font-family:Fredoka,Nunito,sans-serif;font-size:19px;font-weight:700}' +
      '.ariw-opt span{display:block;font-size:14px;opacity:.92;margin-top:2px}' +
      '.ariw-foot{font-size:13.5px;color:#8D6E63;margin-top:14px;text-align:center}' +
      '.ariw-foot a{color:#4A3229;font-weight:800}';

    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    var back = document.createElement('div');
    back.className = 'ariw-back';
    back.setAttribute('role', 'dialog');
    back.setAttribute('aria-modal', 'true');
    back.setAttribute('aria-labelledby', 'ariw-title');
    back.innerHTML =
      '<div class="ariw">' +
        '<div class="ariw-eye">One for the grown-up</div>' +
        '<h2 id="ariw-title">Unlock ' + m.name + ', and every other machine</h2>' +
        '<span class="ariw-topic">Matches ' + m.topic + '</span>' +
        '<p>Your ' + CONFIG.freeMachines + ' free machines are used up. Join to open all <b>' + TOTAL + ' machines</b>, and every new one we add.</p>' +
        '<p>Each machine is matched to a science topic your child meets at school in Years 3 to 6.</p>' +
        '<a class="ariw-opt main" data-plan="monthly" href="' + payLink(CONFIG.monthlyLink, id) + '"><strong>' + CONFIG.monthlyPrice + ' a month</strong><span>Cancel any time.</span></a>' +
        '<a class="ariw-opt" data-plan="lifetime" href="' + payLink(CONFIG.lifetimeLink, id) + '"><strong>' + CONFIG.lifetimePrice + ' once, founding family</strong><span>Pay once, keep Ari for good. First ' + CONFIG.lifetimeCap + ' families only.</span></a>' +
        '<div class="ariw-foot"><a href="/join.html">What your child learns</a> · <a href="/">Back to the free machine</a></div>' +
      '</div>';

    var mount = function () {
      document.body.appendChild(back);
      document.documentElement.style.overflow = 'hidden';
      track('wall_shown', { machine: id });
    };
    if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);

    back.addEventListener('click', function (e) {
      var a = e.target.closest ? e.target.closest('.ariw-opt') : null;
      if (!a) return;
      track('wall_click', { machine: id, plan: a.getAttribute('data-plan') });
      if (a.getAttribute('href') === '#') e.preventDefault(); // test mode, no Stripe link yet
    });
  }
})();
