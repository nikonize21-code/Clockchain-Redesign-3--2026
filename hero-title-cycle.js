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
  var FADE = 1200;   // ms for the blur-fade out / in (slow, gradual)
  var BLUR = 18;     // px of blur at the peak of the transition

  var reduce = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function render(line) {
    var str = line.text, cut = str.length - line.green;
    var head = str.slice(0, cut).replace(/ /g, '\u00A0');
    var tail = str.slice(cut).replace(/ /g, '\u00A0');
    el.innerHTML = head + '<span class="hs-em">' + tail + '</span>';
  }

  el.style.transition = 'opacity ' + FADE + 'ms ease-in-out, filter ' + FADE + 'ms ease-in-out';
  el.style.willChange = 'opacity, filter';

  var idx = 0;
  render(LINES[0]);

  function loop() {
    setTimeout(function () {
      if (reduce) {                       // honor reduced-motion: instant swap
        idx = (idx + 1) % LINES.length;
        render(LINES[idx]);
        return loop();
      }
      // defocus + fade out
      el.style.opacity = '0';
      el.style.filter = 'blur(' + BLUR + 'px)';
      setTimeout(function () {
        idx = (idx + 1) % LINES.length;
        render(LINES[idx]);
        // new line starts blurred, then resolves into focus
        el.style.filter = 'blur(' + BLUR + 'px)';
        // force reflow so the next transition takes effect
        void el.offsetWidth;
        el.style.opacity = '1';
        el.style.filter = 'blur(0px)';
        loop();
      }, FADE);
    }, HOLD);
  }
  loop();
})();
