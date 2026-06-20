/* ============================================================
   Hero title cycler
   "The Original Clock"  ⇄  "Time You Can Prove"
   Holds each title, then softly fades/lifts to the next line.
   The final 5 chars (Clock / Prove) render in brand green.
   ============================================================ */
(function () {
  var el = document.querySelector('.hero--orbit .hero-title');
  if (!el) return;

  var LINES = [
    { text: 'The Original Clock', green: 5 },
    { text: 'Time You Can Prove', green: 5 }
  ];

  var HOLD = 5000;   // ms each title stays fully visible
  var FADE = 600;    // ms for the fade out / fade in

  var reduce = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function render(line) {
    var str = line.text, cut = str.length - line.green;
    var head = str.slice(0, cut).replace(/ /g, '\u00A0');
    var tail = str.slice(cut).replace(/ /g, '\u00A0');
    el.innerHTML = head + '<span class="hs-em">' + tail + '</span>';
  }

  el.style.transition = 'opacity ' + FADE + 'ms ease, transform ' + FADE + 'ms ease';
  el.style.willChange = 'opacity, transform';

  var idx = 0;
  render(LINES[0]);

  function loop() {
    setTimeout(function () {
      if (reduce) {                       // honor reduced-motion: instant swap
        idx = (idx + 1) % LINES.length;
        render(LINES[idx]);
        return loop();
      }
      // fade + lift out
      el.style.opacity = '0';
      el.style.transform = 'translateY(-8px)';
      setTimeout(function () {
        idx = (idx + 1) % LINES.length;
        render(LINES[idx]);
        // drop in from just below, then settle
        el.style.transform = 'translateY(8px)';
        // force reflow so the next transition takes effect
        void el.offsetWidth;
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
        loop();
      }, FADE);
    }, HOLD);
  }
  loop();
})();
