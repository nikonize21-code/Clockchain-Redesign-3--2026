/* Clockchain merged — Tweaks app (applies variant/accent/type/density to the page) */
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "variant": "daylight",
  "accent": "bright",
  "displayFont": "grotesk",
  "bodyFont": "inter",
  "headWeight": "regular",
  "bodyWeight": "regular",
  "density": "comfortable",
  "heroBtn": "solid",
  "globeSize": 100
}/*EDITMODE-END*/;

function applyTweaks(t){
  const root = document.documentElement;
  // variant: daylight / eclipse / hybrid
  if (t.variant === 'hybrid') {
    root.setAttribute('data-variant', 'daylight');
    root.setAttribute('data-hybrid', '1');
  } else {
    root.setAttribute('data-variant', t.variant);
    root.removeAttribute('data-hybrid');
  }
  root.setAttribute('data-accent', t.accent);
  root.setAttribute('data-font', t.displayFont);
  root.setAttribute('data-bodyfont', t.bodyFont);
  root.setAttribute('data-headweight', t.headWeight);
  root.setAttribute('data-bodyweight', t.bodyWeight);
  root.setAttribute('data-density', t.density);
  root.setAttribute('data-herobtn', t.heroBtn);
  root.setAttribute('data-globesize', t.globeSize);
  if (typeof window.__setGlobeSize === 'function') window.__setGlobeSize(t.globeSize / 100);
  try { localStorage.setItem('clockchain-merged-tweaks-v2', JSON.stringify({
    variant: t.variant,
    accent: t.accent, displayFont: t.displayFont, bodyFont: t.bodyFont, headWeight: t.headWeight, bodyWeight: t.bodyWeight, density: t.density,
    heroBtn: t.heroBtn, globeSize: t.globeSize
  })); } catch(e){}
  if (typeof window.__recolorGlobe === 'function') {
    // let CSS vars settle, then recolor the three.js materials
    requestAnimationFrame(() => requestAnimationFrame(window.__recolorGlobe));
  }
}

function readInitial(){
  const root = document.documentElement;
  return Object.assign({}, TWEAK_DEFAULTS, {
    variant: root.getAttribute('data-hybrid') ? 'hybrid' : (root.getAttribute('data-variant') || TWEAK_DEFAULTS.variant),
    accent: root.getAttribute('data-accent') || TWEAK_DEFAULTS.accent,
    displayFont: root.getAttribute('data-font') || TWEAK_DEFAULTS.displayFont,
    bodyFont: root.getAttribute('data-bodyfont') || TWEAK_DEFAULTS.bodyFont,
    headWeight: root.getAttribute('data-headweight') || TWEAK_DEFAULTS.headWeight,
    bodyWeight: root.getAttribute('data-bodyweight') || TWEAK_DEFAULTS.bodyWeight,
    density: root.getAttribute('data-density') || TWEAK_DEFAULTS.density,
    heroBtn: root.getAttribute('data-herobtn') || TWEAK_DEFAULTS.heroBtn,
    globeSize: (function(){ var a = parseFloat(root.getAttribute('data-globesize')); return isNaN(a) ? TWEAK_DEFAULTS.globeSize : a; })()
  });
}

function TweaksApp(){
  const [t, setTweak] = useTweaks(readInitial());
  React.useEffect(() => { applyTweaks(t); }, [t]);
  return (
    <TweaksPanel title="Tweaks">
      <TweakSection label="Visual direction" />
      <TweakRadio label="Variant" value={t.variant}
        options={['daylight','eclipse','hybrid']}
        onChange={(v)=>setTweak('variant', v)} />
      <TweakColor label="Accent" value={t.accent === 'forest' ? '#0a9d44' : t.accent === 'bright' ? '#00cc00' : '#0a9d6e'}
        options={['#0a9d44','#00cc00','#0a9d6e']}
        onChange={(hex)=>setTweak('accent', hex === '#0a9d44' ? 'forest' : hex === '#00cc00' ? 'bright' : 'emerald')} />

      <TweakSection label="Typography" />
      <TweakRadio label="Headlines" value={t.displayFont}
        options={['grotesk','inter']}
        onChange={(v)=>setTweak('displayFont', v)} />
      <TweakRadio label="Headline weight" value={t.headWeight}
        options={['regular','light','thin']}
        onChange={(v)=>setTweak('headWeight', v)} />
      <TweakRadio label="Body" value={t.bodyFont}
        options={['inter','grotesk']}
        onChange={(v)=>setTweak('bodyFont', v)} />
      <TweakRadio label="Body weight" value={t.bodyWeight}
        options={['regular','light','thin']}
        onChange={(v)=>setTweak('bodyWeight', v)} />

      <TweakSection label="Spacing" />
      <TweakRadio label="Density" value={t.density}
        options={['compact','comfortable','airy']}
        onChange={(v)=>setTweak('density', v)} />

      <TweakSection label="Hero button" />
      <TweakRadio label="Style" value={t.heroBtn}
        options={['solid','white','clear']}
        onChange={(v)=>setTweak('heroBtn', v)} />

      <TweakSection label="Globe" />
      <TweakSlider label="Size" value={t.globeSize} min={60} max={150} step={5} unit="%"
        onChange={(v)=>setTweak('globeSize', v)} />
    </TweaksPanel>
  );
}

if (!window.__EMBED) {
  ReactDOM.createRoot(document.getElementById('tweaks-root')).render(<TweaksApp />);
}
