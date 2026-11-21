/* A short band for the grown-up at the top of every question page. The page itself
   is for the child; this tells the parent, in ten seconds, what Ari is for and where
   to read more. Hidden for members and for anyone who has closed it. */
(function () {
  var KEY = 'ari_parent_band';
  function get(k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { window.localStorage.setItem(k, v); } catch (e) {} }
  if (get(KEY) === 'closed' || get('ari_member') === '1') return;

  function build() {
    var nav = document.querySelector('.wrap > nav'); if (!nav || document.getElementById('ariParents')) return;
    var page = (location.pathname.replace(/^\/|\.html$/g, '') || 'jet');
    var css = document.createElement('style');
    css.textContent =
      '.pband{position:relative;background:#fff;border:1.5px solid var(--peach-warm,#FFD4B8);border-radius:18px;padding:14px 44px 14px 16px;margin:4px 0 18px;box-shadow:0 6px 18px rgba(120,80,50,.07)}' +
      '.pband .e{font-family:var(--mono,ui-monospace,monospace);font-size:11.5px;font-weight:600;letter-spacing:.08em;color:var(--orange-dark,#E8622C)}' +
      '.pband h2{font-family:Fredoka,sans-serif;font-size:clamp(19px,4.6vw,24px);line-height:1.2;color:var(--ink,#4A3229);margin:3px 0 4px}' +
      '.pband p{font-size:15px;line-height:1.45;color:var(--brown-mid,#8D6E63);margin:0;max-width:640px}' +
      '.pband .row{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:10px}' +
      '.pband a.b,.pband button.b{font-family:Nunito,sans-serif;font-weight:800;font-size:15px;border-radius:999px;padding:10px 16px;min-height:44px;display:inline-flex;align-items:center;text-decoration:none;cursor:pointer}' +
      '.pband a.b{background:var(--orange-dark,#E8622C);color:#fff;border:none}' +
      '.pband button.b{background:transparent;color:var(--ink,#4A3229);border:1.5px solid var(--brown-light,#BCAAA4)}' +
      '.pband .fine{font-size:13.5px;color:var(--brown-mid,#8D6E63)}' +
      '@media (max-width:560px){.pband{padding:12px 40px 12px 14px}.pband p{display:none}.pband .row{margin-top:8px}.pband a.b,.pband button.b{padding:8px 14px;font-size:14.5px}.pband .fine{flex-basis:100%}}' +
      '.pband .x{position:absolute;top:6px;right:6px;width:36px;height:36px;border:none;background:transparent;font-size:22px;line-height:1;color:var(--brown-light,#BCAAA4);cursor:pointer;border-radius:50%}' +
      '.pband .x:focus-visible,.pband .b:focus-visible{outline:3px solid var(--orange,#FF8C42);outline-offset:2px}';
    document.head.appendChild(css);

    var b = document.createElement('aside'); b.className = 'pband'; b.id = 'ariParents'; b.setAttribute('aria-label', 'For the grown-up');
    b.innerHTML =
      '<button class="x" type="button" aria-label="Close this note">×</button>' +
      '<div class="e">FOR THE GROWN-UP</div>' +
      '<h2>An AI can give your child any answer. Ari teaches them to check it.</h2>' +
      '<p>Every question here ends with a case: a problem to make sense of, a machine to test it on, and a confident answer with one mistake in it.</p>' +
      '<div class="row"><a class="b" href="/join.html?ref=' + page + '-band">How Ari works</a>' +
      '<button class="b" type="button" data-play>Let them play ↓</button>' +
      '<span class="fine">Three free, no sign-up. Then £5 a month.</span></div>';
    nav.parentNode.insertBefore(b, nav.nextSibling);

    function close() { set(KEY, 'closed'); b.remove(); }
    b.querySelector('.x').addEventListener('click', close);
    b.querySelector('[data-play]').addEventListener('click', function () {
      close();
      var t = document.querySelector('header.intro') || document.querySelector('section.rig') || document.querySelector('section.hero');
      if (t && t.scrollIntoView) t.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build); else build();
})();
