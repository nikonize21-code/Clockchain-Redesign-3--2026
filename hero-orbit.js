/* ============================================================
   Clockchain — Hero orbital-logo animation
   Ported verbatim from clockchain-orbit-logo.html (source of truth).
   Orbital model, eased clock (smoother), logo-blend (LF), measured
   proportions, and drawRays line-burst are UNCHANGED. Adapted only to:
     - run inside the .hero container (not full window)
     - bake production settings, drop the control panel
     - transparent canvas (clearRect) so the hero surface shows through
     - respect prefers-reduced-motion (single static aligned frame)
   ============================================================ */
(() => {
  const host = document.querySelector('.hero');
  const canvas = document.getElementById('hero-orbit');
  if (!host || !canvas) return;
  const ctx = canvas.getContext('2d');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // measured proportions of the aligned logo, relative to Sun radius = 1
  const ER = 0.8349, MR = 0.391;       // Earth / Moon radius (Earth +10%: 0.759→0.8349)
  const E_UP = 0.1681, M_UP = 0.4399;   // Earth up from Sun lowered by the +10% growth so Earth's TOP stays aligned with the Sun's top at syzygy; Moon up from Earth raised by the same 0.0759 so the Moon's top also stays aligned at syzygy

  // --- baked production settings ---
  const P = { speed: 0.45, width: 5, holdTime: 1.5, ratio: 3, guides: false, glow: false, transparent: true,
              rays: true, rayIntensity: 0.36, raySpeed: 0.2, rayColor: '#000000', rayHalf: 'bottom',
              green: '#00cc00', earth: '#00cc00', land: '#0a7d22', bg: '#ffffff', hold: false,
              posY: 0.5, sizeCap: 0.135 };   // posY = logo vertical center (fraction of hero); sizeCap = max Sun radius (fraction of hero height)
  let LF = 1;       // logo factor: 1 = flat two-tone logo at syzygy, 0 = full 3D spheres
  let clock = 0;    // eased master clock
  let rayTime = 0;  // independent clock for the line-burst ripple
  let earthSpin = 0; // slow longitudinal rotation of the globe (radians)

  /* ---- Earth land map ----
     Real coastlines: rasterise the SAME world-atlas country polygons that the
     wireframe globe in the next section uses, into an equirectangular land
     mask. A coarse box outline is filled first so the globe shows continents
     instantly and still works if the CDN is unreachable. ---- */
  const MAPW = 720, MAPH = 360;
  const landMap = new Uint8Array(MAPW * MAPH);
  const LAND_BOXES = [
    [48,72,-168,-90],[30,52,-126,-92],[24,50,-95,-64],[14,30,-112,-82],[7,15,-84,-77],[60,82,-52,-18],
    [2,12,-79,-60],[-18,4,-80,-44],[-32,-16,-70,-49],[-52,-30,-74,-63],
    [40,60,-10,28],[54,71,5,42],[36,46,-9,20],[36,44,12,30],
    [18,35,-13,32],[8,20,-17,44],[-12,12,8,43],[-34,-10,13,40],[-26,-12,43,51],
    [12,40,34,60],[36,72,40,140],[40,68,135,180],[20,50,60,120],[8,30,68,90],[10,28,95,110],[31,45,130,146],
    [-9,8,95,140],[-10,5,128,150],[-38,-12,114,150],[-47,-34,166,179],[-90,-65,-180,180],
  ];
  (function buildBoxFallback(){
    for (let iy = 0; iy < MAPH; iy++) {
      const lat = 90 - (iy + 0.5) / MAPH * 180;
      for (let ix = 0; ix < MAPW; ix++) {
        const lon = (ix + 0.5) / MAPW * 360 - 180;
        let v = 0;
        for (let b = 0; b < LAND_BOXES.length; b++) { const q = LAND_BOXES[b]; if (lat>=q[0]&&lat<=q[1]&&lon>=q[2]&&lon<=q[3]) { v = 1; break; } }
        landMap[iy * MAPW + ix] = v;
      }
    }
  })();
  // light direction (upper-left-front), matching the other spheres
  const _Ln = Math.hypot(0.45, 0.5, 0.74), LX = -0.45/_Ln, LY = -0.5/_Ln, LZ = 0.74/_Ln;
  let earthOff = null, earthImg = null, earthD = 0;

  /* fetch the real country polygons and rasterise them into landMap (filled continents) */
  (function loadCoastlines(){
    fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
      .then(function(r){ return r.json(); })
      .then(function(topo){
        const sc=topo.transform.scale, tr=topo.transform.translate, arcs=topo.arcs;
        function decodeArc(idx){var rev=idx<0,raw=arcs[rev?~idx:idx],out=[],x=0,y=0;for(var i=0;i<raw.length;i++){x+=raw[i][0];y+=raw[i][1];out.push([x*sc[0]+tr[0],y*sc[1]+tr[1]]);}if(rev)out.reverse();return out;}
        function stitchRing(idxs){var pts=[];idxs.forEach(function(idx,i){var a=decodeArc(idx);pts=pts.concat(i===0?a:a.slice(1));});return pts;}
        var rings=[];
        topo.objects.countries.geometries.forEach(function(geom){
          if(geom.type==='Polygon')geom.arcs.forEach(function(r){rings.push(stitchRing(r));});
          else if(geom.type==='MultiPolygon')geom.arcs.forEach(function(p){p.forEach(function(r){rings.push(stitchRing(r));});});
        });
        var off=document.createElement('canvas'); off.width=MAPW; off.height=MAPH;
        var o=off.getContext('2d'); o.clearRect(0,0,MAPW,MAPH); o.fillStyle='#fff';
        for(var ri=0; ri<rings.length; ri++){
          var ring=rings[ri]; o.beginPath(); var started=false, prevX=null;
          for(var i=0;i<ring.length;i++){
            var x=(ring[i][0]+180)/360*MAPW, y=(90-ring[i][1])/180*MAPH;
            if(prevX!==null && Math.abs(x-prevX)>MAPW*0.5){ o.closePath(); o.fill(); o.beginPath(); started=false; }  // split at the dateline
            if(!started){ o.moveTo(x,y); started=true; } else { o.lineTo(x,y); }
            prevX=x;
          }
          o.closePath(); o.fill();
        }
        var d=o.getImageData(0,0,MAPW,MAPH).data;
        for(var p=0;p<MAPW*MAPH;p++){ landMap[p] = d[p*4] > 100 ? 1 : 0; }
        if (reduceMotion || P.hold) step(0);
      }).catch(function(){});
  })();

  let W, H, cx, cy, Rs, dpr;
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = host.getBoundingClientRect();
    W = Math.max(1, Math.round(rect.width));
    H = Math.max(1, Math.round(rect.height));
    canvas.width = Math.floor(W * dpr); canvas.height = Math.floor(H * dpr);
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx = W / 2; cy = Math.round(H * (W < 640 ? 0.52 : P.posY));  // bias the logo below the statement + CTA
    if (reduceMotion || P.hold) step(0);
  }

  // --- color helpers ---
  function hexToRgb(h) { h = h.replace('#', ''); return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)]; }
  function mix(hex, t, toward) { const [r,g,b] = hexToRgb(hex); const [R,G,B] = toward;
    return `rgb(${Math.round(r+(R-r)*t)},${Math.round(g+(G-g)*t)},${Math.round(b+(B-b)*t)})`; }
  const lighten = (hex, t) => mix(hex, t, [255,255,255]);
  const darken  = (hex, t) => mix(hex, t, [0,0,0]);

  // --- a photoreal-ish rotating globe: orthographic projection of the land map with day-side shading ---
  function drawEarth(x, y, r, spin) {
    const D = Math.max(16, Math.round(Math.min(2 * r * dpr, 320)));
    if (!earthOff) earthOff = document.createElement('canvas');
    if (earthD !== D) {
      earthOff.width = earthOff.height = D;
      earthImg = earthOff.getContext('2d').createImageData(D, D);
      earthD = D;
    }
    const data = earthImg.data, rad = D / 2;
    const spinDeg = spin * 180 / Math.PI;
    const OCR = 199, OCG = 205, OCB = 209;        // ocean = light gray
    const LDR = 8, LDG = 92, LDB = 26;            // land  = deep green #085c1a
    const amb = 0.30;                              // ambient (night side floor)
    for (let j = 0; j < D; j++) {
      const ny = (j + 0.5) / rad - 1;
      for (let i = 0; i < D; i++) {
        const nx = (i + 0.5) / rad - 1;
        const idx = (j * D + i) * 4;
        const d2 = nx * nx + ny * ny;
        if (d2 > 1) { data[idx + 3] = 0; continue; }
        const nz = Math.sqrt(1 - d2);
        const lat = Math.asin(Math.max(-1, Math.min(1, -ny))) * 57.29578;
        let lon = Math.atan2(nx, nz) * 57.29578 + spinDeg;
        lon = ((lon + 180) % 360 + 360) % 360 - 180;
        let ix = ((lon + 180) / 360 * MAPW) | 0; if (ix >= MAPW) ix = MAPW - 1; if (ix < 0) ix = 0;
        let iy = ((90 - lat) / 180 * MAPH) | 0; if (iy >= MAPH) iy = MAPH - 1; if (iy < 0) iy = 0;
        const land = landMap[iy * MAPW + ix];
        let diff = nx * LX + ny * LY + nz * LZ; if (diff < 0) diff = 0;
        const shade = amb + (1 - amb) * diff;
        let cr, cg, cb;
        if (land) { cr = LDR * shade; cg = LDG * shade; cb = LDB * shade; }
        else {
          cr = OCR * shade; cg = OCG * shade; cb = OCB * shade;
          const sp = Math.pow(diff, 14) * 90;       // ocean specular sheen
          cr += sp; cg += sp; cb += sp;
        }
        const rim = d2 * d2 * d2;                   // atmosphere halo near the lit limb
        if (diff > 0.05) { const a = rim * 70 * diff; cr += a * 0.45; cg += a; cb += a * 0.5; }
        data[idx]   = cr > 255 ? 255 : cr;
        data[idx+1] = cg > 255 ? 255 : cg;
        data[idx+2] = cb > 255 ? 255 : cb;
        data[idx+3] = 255;
      }
    }
    earthOff.getContext('2d').putImageData(earthImg, 0, 0);
    ctx.drawImage(earthOff, x - r, y - r, 2 * r, 2 * r);
  }

  // --- a shaded 3D sphere (light from upper-left) ---
  function sphere(x, y, r, baseHex, isBody, isEarth) {
    const lf = LF;
    if (isEarth) {                                  // the rotating green globe
      if (lf < 0.999) drawEarth(x, y, r, earthSpin);
      if (lf > 0.001) {                             // resolve to the white logo interior at syzygy
        ctx.globalAlpha = lf;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); ctx.fill();
        ctx.globalAlpha = 1;
      }
      return;
    }
    if (P.glow && isBody && lf < 1) {
      const [rr,gg,bb] = hexToRgb(baseHex);
      const halo = ctx.createRadialGradient(x, y, r * 0.92, x, y, r * 1.55);
      halo.addColorStop(0, `rgba(${rr},${gg},${bb},${0.40 * (1 - lf)})`);
      halo.addColorStop(1, `rgba(${rr},${gg},${bb},0)`);
      ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(x, y, r * 1.55, 0, Math.PI*2); ctx.fill();
    }
    const lx = x - r * 0.36, ly = y - r * 0.36;
    const g = ctx.createRadialGradient(lx, ly, r * 0.04, x, y, r * 1.04);
    g.addColorStop(0.00, lighten(baseHex, 0.62));
    g.addColorStop(0.45, baseHex);
    g.addColorStop(0.86, darken(baseHex, 0.42));
    g.addColorStop(1.00, darken(baseHex, 0.62));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); ctx.fill();
    if (lf > 0.001) {  // blend toward the flat logo at the syzygy
      ctx.globalAlpha = lf;
      ctx.fillStyle = isBody ? baseHex : '#000000';
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); ctx.fill();
      ctx.globalAlpha = 1;
    }
    if (lf < 1) {  // specular glint, fades out as the logo forms
      const sx = x - r*0.40, sy = y - r*0.40, sr = r*0.5;
      const sp = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr);
      sp.addColorStop(0, `rgba(255,255,255,${(isBody ? 0.5 : 0.28) * (1 - lf)})`); sp.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); ctx.clip();
      ctx.fillStyle = sp; ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI*2); ctx.fill(); ctx.restore();
    }
  }

  function ellipse(x, y, rx, ry) {
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0,0,0,0.10)'; ctx.lineWidth = 1; ctx.stroke();
  }

  // --- line-burst background: radial fan with a traveling ripple (dark lines, normal blending) ---
  function drawRays(time) {
    const R = Math.hypot(W, H) * 0.75;
    const narrow = W < 640;
    const N = narrow ? 120 : 200, cluster = 2.2, maxAng = (Math.PI / 2) * 0.96, amp = 0.16, freq = 2.6, STEPS = 44;
    const [cr, cg, cb] = hexToRgb(P.rayColor);
    const a = P.rayIntensity, speed = P.raySpeed, half = P.rayHalf;
    ctx.lineWidth = 1;
    for (let i = 0; i < N; i++) {
      const s = (i / (N - 1)) * 2 - 1, sign = s < 0 ? -1 : 1;
      if (half === 'both') {
        // full chord through the center seam, fanning to all four corners
        const baseAngle = sign * Math.pow(Math.abs(s), cluster) * maxAng;
        const dx = Math.cos(baseAngle) * R, dy = Math.sin(baseAngle) * R;
        const grad = ctx.createLinearGradient(cx - dx, cy - dy, cx + dx, cy + dy);
        grad.addColorStop(0.00, `rgba(${cr},${cg},${cb},0)`);
        grad.addColorStop(0.18, `rgba(${cr},${cg},${cb},${a * 0.12})`);
        grad.addColorStop(0.50, `rgba(${cr},${cg},${cb},${a})`);
        grad.addColorStop(0.82, `rgba(${cr},${cg},${cb},${a * 0.12})`);
        grad.addColorStop(1.00, `rgba(${cr},${cg},${cb},0)`);
        ctx.strokeStyle = grad;
        ctx.beginPath();
        for (let j = 0; j <= STEPS; j++) {
          const t = (j / STEPS) * 2 - 1;
          const ang = baseAngle + amp * Math.sin(t * freq + baseAngle * 1.5 + time * speed);
          const rr = t * R, x = cx + Math.cos(ang) * rr, y = cy + Math.sin(ang) * rr;
          if (j === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      } else {
        // half-rays from the seam into one hemisphere (canvas +y is down -> bottom)
        const aMag = Math.pow(Math.abs(s), cluster) * maxAng;
        const vert = half === 'top' ? -1 : 1;
        const dir = s >= 0 ? vert * aMag : Math.PI - vert * aMag;
        const ex = cx + Math.cos(dir) * R, ey = cy + Math.sin(dir) * R;
        const grad = ctx.createLinearGradient(cx, cy, ex, ey);
        grad.addColorStop(0.00, `rgba(${cr},${cg},${cb},${a})`);
        grad.addColorStop(0.32, `rgba(${cr},${cg},${cb},${a * 0.10})`);
        grad.addColorStop(1.00, `rgba(${cr},${cg},${cb},0)`);
        ctx.strokeStyle = grad;
        ctx.beginPath();
        for (let j = 0; j <= STEPS; j++) {
          const t = j / STEPS;
          const ang = dir + amp * Math.sin(t * freq + dir * 1.5 + time * speed);
          const rr = t * R, x = cx + Math.cos(ang) * rr, y = cy + Math.sin(ang) * rr;
          if (j === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }
  }

  function smooth(e0, e1, x) { const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); }
  function smoother(u) { return u * u * u * (u * (u * 6 - 15) + 10); }  // zero velocity at u=0 and u=1
  let last = performance.now();
  function step(dt) {
    rayTime += dt;
    earthSpin += dt * 0.16;   // gentle planetary rotation
    // --- eased clock: one revolution per cycle, decelerating to a full stop on the logo ---
    const moveT = 7 / Math.max(P.speed, 0.05);   // seconds for one revolution
    const cycleT = moveT + P.holdTime;
    let phase;
    if (P.hold) { phase = 0; }
    else {
      clock += dt;
      const lt = clock % cycleT;
      phase = lt < moveT ? smoother(lt / moveT) : 0;   // 0->1 eased, then hold at the logo
    }
    const dist = Math.min(phase, 1 - phase);
    LF = 1 - smooth(0.05, 0.14, dist);                 // blend to the flat logo near alignment
    const the = phase * 2 * Math.PI;
    const thm = phase * 2 * Math.PI * P.ratio;

    // Sun radius auto-fits so the (wider) orbit stays on screen.
    // On phones, narrow the swing so the logo doesn't shrink to a dot.
    const narrow = W < 640;
    const widthEff = narrow ? 2.6 : P.width;
    const capEff = narrow ? 0.20 : P.sizeCap;
    Rs = Math.min(W * 0.46 / (1.5 * widthEff + 0.5), H * capEff);
    const Reo = widthEff * Rs;         // Earth orbit half-width (swing)
    const Rmo = widthEff * 0.5 * Rs;   // Moon orbit half-width around Earth
    const eOff = E_UP * Rs, mOff = M_UP * Rs;  // vertical offsets fixed by the logo

    const ex = cx + Reo * Math.sin(the);
    const ey = cy - eOff * Math.cos(the);
    const ez = Reo * Math.cos(the);
    const mx = ex + Rmo * Math.sin(thm);
    const my = ey - mOff * Math.cos(thm);
    const mz = ez + Rmo * Math.cos(thm);

    if (P.transparent) ctx.clearRect(0, 0, W, H);
    else { ctx.fillStyle = P.bg; ctx.fillRect(0, 0, W, H); }

    if (P.rays) drawRays(rayTime);

    if (P.guides) { ellipse(cx, cy, Reo, eOff); ellipse(ex, ey, Rmo, mOff); }

    const bodies = [
      { x: cx, y: cy, z: 0,  r: Rs,      c: P.green, body: true  },  // Sun
      { x: ex, y: ey, z: ez, r: ER * Rs, c: P.earth, body: false, earth: true },  // Earth
      { x: mx, y: my, z: mz, r: MR * Rs, c: P.green, body: true  },  // Moon
    ];
    bodies.sort((a, b) => a.z - b.z);
    bodies.forEach(b => sphere(b.x, b.y, b.r, b.c, b.body, b.earth));
  }

  let raf;
  function loop(now) { const dt = Math.min((now - last) / 1000, 0.05); last = now; step(dt); raf = requestAnimationFrame(loop); }

  // size to the hero, then run (or draw a single static aligned frame for reduced motion)
  if ('ResizeObserver' in window) { new ResizeObserver(resize).observe(host); }
  window.addEventListener('resize', resize);
  resize();
  if (reduceMotion) { P.hold = true; step(0); } else { last = performance.now(); raf = requestAnimationFrame(loop); }

  /* ============================================================
     Live tuning panel — only when the URL has ?tune
     Visitors never see this. Drag the sliders, then hit
     "Copy settings" and paste the block back to bake the values.
     ============================================================ */
  /* ============================================================
     Live tuning panel — opens when ANY of these is true:
       • URL has ?tune   (e.g. index.html?tune)
       • URL has #tune   (e.g. index.html#tune)
       • you press  Shift + T  on the page
     Visitors never see it. Drag the sliders, then "Copy settings".
     ============================================================ */
  let tunePanelBuilt = false;
  function maybeTune() {
    const on = new URLSearchParams(location.search).has('tune') || location.hash.toLowerCase() === '#tune';
    if (on && !tunePanelBuilt) { tunePanelBuilt = true; buildTunePanel(); }
  }
  maybeTune();
  window.addEventListener('hashchange', maybeTune);
  window.addEventListener('keydown', (e) => {
    if (e.shiftKey && (e.key === 'T' || e.key === 't') && !/input|textarea|select/i.test(e.target.tagName)) {
      if (!tunePanelBuilt) { tunePanelBuilt = true; buildTunePanel(); }
      else { const p = document.querySelector('.ho-panel'); if (p) p.classList.toggle('hidden'); }
    }
  });

  function buildTunePanel() {
    const refresh = () => { if (reduceMotion || P.hold) step(0); };

    const style = document.createElement('style');
    style.textContent = `
      .ho-panel{position:fixed;top:74px;right:16px;width:268px;max-height:calc(100vh - 90px);overflow:auto;
        background:rgba(20,20,24,0.92);backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,0.10);
        border-radius:12px;padding:14px;color:#d9d9de;font:12px/1.4 ui-sans-serif,system-ui,sans-serif;z-index:9999;
        transition:transform .25s ease,opacity .25s ease;}
      .ho-panel.hidden{transform:translateX(calc(100% + 16px));opacity:0;}
      .ho-panel h2{font-size:11px;text-transform:uppercase;letter-spacing:.12em;color:#8a8a92;margin:0 0 12px;}
      .ho-panel .row{display:flex;flex-direction:column;gap:4px;margin-bottom:10px;}
      .ho-panel .row label{display:flex;justify-content:space-between;color:#b8b8c0;}
      .ho-panel .row label .val{color:#fff;font-variant-numeric:tabular-nums;}
      .ho-panel input[type=range]{width:100%;accent-color:#00cc00;}
      .ho-panel input[type=color]{width:100%;height:26px;border:none;background:none;border-radius:6px;cursor:pointer;}
      .ho-panel select{width:100%;background:rgba(255,255,255,0.08);color:#fff;border:1px solid rgba(255,255,255,0.14);border-radius:7px;padding:6px;font-size:12px;}
      .ho-panel .two{display:flex;gap:8px;}.ho-panel .two>div{flex:1;}
      .ho-panel .check{display:flex;align-items:center;gap:8px;margin-bottom:10px;color:#b8b8c0;}
      .ho-panel .check input{accent-color:#00cc00;}
      .ho-panel .btns{display:flex;gap:8px;margin-top:4px;position:sticky;bottom:-14px;
        background:rgba(20,20,24,0.96);padding:12px 0 2px;margin-bottom:-2px;}
      .ho-panel .btns button{flex:1;background:rgba(255,255,255,0.08);color:#fff;border:1px solid rgba(255,255,255,0.12);border-radius:7px;padding:9px;font-size:11px;cursor:pointer;}
      .ho-panel .btns button:hover{background:rgba(255,255,255,0.16);}
      .ho-panel .btns button.primary{background:#00cc00;border-color:#00cc00;color:#04210b;font-weight:600;}
      .ho-panel .ho-out{width:100%;margin-top:10px;min-height:64px;resize:vertical;background:rgba(0,0,0,0.35);
        color:#9effa0;border:1px solid rgba(255,255,255,0.14);border-radius:7px;padding:8px;
        font:11px/1.4 ui-monospace,Menlo,monospace;white-space:pre-wrap;word-break:break-word;display:none;}
      .ho-panel .ho-out.show{display:block;}
      .ho-toggle{position:fixed;top:74px;right:16px;z-index:9999;background:rgba(20,20,24,0.92);color:#fff;
        border:1px solid rgba(255,255,255,0.12);border-radius:8px;width:34px;height:34px;cursor:pointer;font-size:15px;display:none;}
      .ho-toggle.show{display:block;}
      @media (max-width:640px){.ho-panel{width:calc(100% - 32px);}}
    `;
    document.head.appendChild(style);

    const slider = (key, label, min, max, opts) => {
      const dec = opts && opts.dec != null ? opts.dec : 2;
      return `<div class="row"><label>${label} <span class="val" data-v="${key}">${(+P[key]).toFixed(dec)}</span></label>
        <input type="range" data-k="${key}" min="${min}" max="${max}" step="${opts && opts.step || 0.01}" value="${P[key]}"></div>`;
    };
    const check = (key, label) => `<div class="check"><input type="checkbox" data-c="${key}" ${P[key] ? 'checked' : ''}><label>${label}</label></div>`;
    const color = (key, label) => `<div class="row"><label>${label}</label><input type="color" data-col="${key}" value="${P[key]}"></div>`;

    const panel = document.createElement('div');
    panel.className = 'ho-panel';
    panel.innerHTML = `
      <h2>Hero orbit — tuning</h2>
      ${check('hold', 'Freeze on logo')}
      ${slider('speed', 'Speed', 0, 2, {dec: 2, step: 0.05})}
      ${slider('width', 'Orbit width', 1.2, 5, {dec: 1, step: 0.1})}
      ${slider('holdTime', 'Hold at logo (s)', 0, 3, {dec: 1, step: 0.1})}
      ${slider('ratio', 'Moon orbits / cycle', 1, 8, {dec: 0, step: 1})}
      ${slider('posY', 'Logo vertical', 0.40, 0.80, {dec: 2, step: 0.01})}
      ${slider('sizeCap', 'Logo size', 0.10, 0.24, {dec: 2, step: 0.005})}
      ${check('glow', 'Atmosphere glow')}
      ${check('guides', 'Orbit guides')}
      ${check('rays', 'Line-burst background')}
      ${slider('rayIntensity', 'Ray intensity', 0, 0.5, {dec: 2, step: 0.01})}
      ${slider('raySpeed', 'Ray motion', 0, 1.5, {dec: 2, step: 0.05})}
      <div class="row"><label>Ray halves</label><select data-sel="rayHalf">
        <option value="both">Both</option><option value="bottom">Bottom only</option><option value="top">Top only</option></select></div>
      <div class="two"><div>${color('green', 'Bodies')}</div><div>${color('earth', 'Earth')}</div></div>
      ${color('rayColor', 'Rays')}
      <div class="btns"><button data-act="copy" class="primary">Copy settings</button><button data-act="hide">Hide</button></div>
      <textarea class="ho-out" readonly placeholder="Your settings will appear here after you click Copy settings — select all and copy, or just paste it back to Claude."></textarea>
    `;
    document.body.appendChild(panel);

    const toggle = document.createElement('button');
    toggle.className = 'ho-toggle'; toggle.textContent = '≡';
    document.body.appendChild(toggle);

    panel.querySelector('[data-sel="rayHalf"]').value = P.rayHalf;

    panel.addEventListener('input', (e) => {
      const t = e.target;
      if (t.dataset.k) {
        P[t.dataset.k] = parseFloat(t.value);
        const dec = t.dataset.k === 'ratio' ? 0 : (t.step.includes('.') ? (t.step.split('.')[1].length) : 2);
        panel.querySelector(`[data-v="${t.dataset.k}"]`).textContent = (+P[t.dataset.k]).toFixed(Math.min(dec, 3));
        if (t.dataset.k === 'posY' || t.dataset.k === 'sizeCap') resize();
        refresh();
      } else if (t.dataset.col) { P[t.dataset.col] = t.value; refresh(); }
    });
    panel.addEventListener('change', (e) => {
      const t = e.target;
      if (t.dataset.c) { P[t.dataset.c] = t.checked; refresh(); }
      else if (t.dataset.sel) { P[t.dataset.sel] = t.value; refresh(); }
    });
    panel.querySelector('[data-act="hide"]').addEventListener('click', () => { panel.classList.add('hidden'); toggle.classList.add('show'); });
    toggle.addEventListener('click', () => { panel.classList.remove('hidden'); toggle.classList.remove('show'); });
    panel.querySelector('[data-act="copy"]').addEventListener('click', (e) => {
      const keys = ['speed','width','holdTime','ratio','guides','glow','transparent','rays','rayIntensity','raySpeed','rayColor','rayHalf','green','earth','land','bg','hold','posY','sizeCap'];
      const fmt = (v) => typeof v === 'string' ? `'${v}'` : v;
      const out = '  const P = { ' + keys.map(k => `${k}: ${fmt(P[k])}`).join(', ') + ' };';
      // always show it in the box so it's visible no matter what the clipboard does
      const box = panel.querySelector('.ho-out');
      box.classList.add('show'); box.value = out; box.focus(); box.select();
      const done = (ok) => { e.target.textContent = ok ? 'Copied ✓' : 'Select & copy ↓'; setTimeout(() => e.target.textContent = 'Copy settings', 1800); };
      let copied = false;
      try { document.execCommand('copy'); copied = true; } catch (_) {}
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(out).then(() => done(true)).catch(() => done(copied));
      } else { done(copied); }
    });
  }
})();
