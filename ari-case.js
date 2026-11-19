/* Ari case files. Each machine page sets window.ARI_CASE, then loads this file.
   Three steps: spot the problem (pick the question worth asking), investigate
   (use the real machine, then answer from the evidence), catch Ari out (find the
   one wrong sentence in a confident explanation). */
(function () {
  var C = window.ARI_CASE; if (!C) return;
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function track(name) { try { if (window.va) window.va('event', { name: name, object: C.id }); } catch (e) {} }
  function fb(box, html, ok) { box.innerHTML = html; box.classList.toggle('ok', !!ok); }

  function build() {
    var rig = document.querySelector(C.anchor || 'section.rig'); if (!rig || document.getElementById('case')) return;

    var flag = el('a', 'case-flag', '<span><b>Case ' + C.num + ': ' + C.flag + '</b> ' + C.flagSub + '</span><span class="go">OPEN THE CASE ↓</span>');
    flag.href = '#case'; if (!C.noFlag) rig.parentNode.insertBefore(flag, rig);

    var sec = el('section', 'case'); sec.id = 'case'; sec.setAttribute('aria-label', 'Case ' + C.num + ': ' + C.title);
    sec.innerHTML =
      '<div class="eyebrow">Case ' + C.num + ' · Fault report</div>' +
      '<h2>' + C.title + '</h2>' +
      '<p>Nobody is going to hand you the question this time. You get a problem and a machine. Work out what\'s going on.</p>' +
      '<div class="report"><span>' + C.who + '</span>' + C.report + '</div>' +
      '<div class="case-steps">' +
        '<div class="cstep" id="cs1"><div class="k">STEP 1 · SPOT THE PROBLEM</div><h3>What do you ask first?</h3>' +
          '<p>That report is a muddle. A good question turns a muddle into something you can test. Pick the best one.</p>' +
          '<div class="copts" id="cq1"></div><div class="cfb" id="cfb1" aria-live="polite"></div></div>' +
        '<div class="cstep locked" id="cs2"><div class="k">STEP 2 · INVESTIGATE</div><h3>' + C.inv.title + '</h3>' +
          '<p>' + C.inv.intro + '</p><ul class="todo" id="ctodo"></ul>' +
          '<p style="margin-top:12px"><b>' + C.inv.q + '</b></p>' +
          '<div class="copts" id="cq2"></div><div class="cfb" id="cfb2" aria-live="polite"></div></div>' +
        '<div class="cstep locked" id="cs3"><div class="k">STEP 3 · CATCH ARI OUT</div><h3>Ari explains. One part is wrong.</h3>' +
          '<div class="ariquote"><div class="owl">🦉</div><p>"Easy! I know exactly what happened." Ari sounds very sure. <b>Tap the sentence that is wrong.</b></p></div>' +
          '<div class="copts" id="cq3"></div><div class="cfb" id="cfb3" aria-live="polite"></div></div>' +
        '<div class="case-done" id="caseDone"><h3>Case closed.</h3>' +
          '<p>You did three things. You <b>found the question</b> hiding in a muddle. You <b>tested it</b> and let the evidence decide. And you <b>caught a confident answer that was wrong</b>. An AI can sound just as sure as Ari did, so that third one matters most.</p></div>' +
      '</div>';
    rig.parentNode.insertBefore(sec, rig.nextSibling);

    var cs1 = sec.querySelector('#cs1'), cs2 = sec.querySelector('#cs2'), cs3 = sec.querySelector('#cs3');
    function options(box, list) {
      list.forEach(function (o, i) { var b = el('button', 'copt', o.t); b.type = 'button'; b.dataset.i = i; box.appendChild(b); });
    }
    function lock(box) { Array.prototype.forEach.call(box.querySelectorAll('button'), function (b) { b.disabled = true; }); }

    // ---- Step 1 ----
    var q1 = sec.querySelector('#cq1'); options(q1, C.q1);
    q1.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b || b.disabled) return; var o = C.q1[+b.dataset.i];
      if (o.ok) { b.classList.add('right'); lock(q1); cs1.classList.add('done'); cs2.classList.remove('locked'); track('case_q1_right'); fb(sec.querySelector('#cfb1'), '<b>That\'s the one.</b> ' + o.fb, true); }
      else { b.classList.add('wrong'); track('case_q1_wrong'); fb(sec.querySelector('#cfb1'), o.fb); }
    });

    // ---- Step 2: evidence first, then the answer ----
    var todo = sec.querySelector('#ctodo'), needs = C.inv.needs.map(function (n) { return { sel: n.sel, on: n.on || 'click', li: el('li', '', n.t), done: false }; });
    needs.forEach(function (n) { todo.appendChild(n.li); });
    function seen(type, target) {
      needs.forEach(function (n) {
        if (n.done || n.on !== type || !target.closest) return;
        if (target.closest(n.sel)) { n.done = true; n.li.classList.add('ok'); }
      });
    }
    ['click', 'input', 'pointerdown'].forEach(function (type) {
      document.addEventListener(type, function (e) { if (!sec.contains(e.target)) seen(type, e.target); }, true);
    });
    var q2 = sec.querySelector('#cq2'), tries = 0; options(q2, C.inv.opts);
    q2.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b || b.disabled) return;
      var missing = needs.filter(function (n) { return !n.done; });
      if (missing.length) {
        var hidden = missing.some(function (n) { var t = document.querySelector(n.sel); return t && t.offsetParent === null; });
        return fb(sec.querySelector('#cfb2'), '<b>Try the machine first.</b> A guess isn\'t evidence. Scroll up and tick off the steps above.' + (hidden ? ' If you can\'t see a button yet, follow Ari\'s steps in the machine and it will appear.' : ''));
      }
      var o = C.inv.opts[+b.dataset.i]; tries++;
      if (o.ok) { b.classList.add('right'); lock(q2); cs2.classList.add('done'); cs3.classList.remove('locked'); track('case_q2_right_' + tries); fb(sec.querySelector('#cfb2'), '<b>Got it.</b> ' + o.fb, true); }
      else { b.classList.add('wrong'); track('case_q2_wrong'); fb(sec.querySelector('#cfb2'), o.fb); }
    });

    // ---- Step 3 ----
    var q3 = sec.querySelector('#cq3'); options(q3, C.ari.map(function (a) { return { t: '"' + a.t + '"' }; }));
    q3.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b || b.disabled) return; var a = C.ari[+b.dataset.i];
      if (a.wrong) { b.classList.add('right'); lock(q3); cs3.classList.add('done'); track('case_q3_right'); fb(sec.querySelector('#cfb3'), '<b>Caught!</b> ' + a.fb, true); sec.querySelector('#caseDone').classList.add('show'); }
      else { b.classList.add('wrong'); track('case_q3_wrong'); fb(sec.querySelector('#cfb3'), 'That part is true. ' + a.fb + ' Look for the sentence that doesn\'t match what you saw.'); }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build); else build();
})();
