/* ============================================================
   Clockchain — Playground logic (VISUAL MOCKUP)
   No real network calls are made. All responses are simulated.
   See submitLog() below for exactly where/how to plug in a live API.
   ============================================================ */
(function(){
  'use strict';

  var DEFAULT_INPUT = 'Q3 board resolution \u2014 final signed copy';
  var ENDPOINT = 'https://api.clockchain.network/v1/log';

  /* ──────────────────────────────────────────────────────────────
     submitLog — SINGLE SOURCE OF TRUTH for talking to the chain.
     Currently returns MOCK data after a short delay.

     ▶ TO GO LIVE: delete the "MOCK" block at the bottom and uncomment
       the "REAL IMPLEMENTATION" block. The request and response shapes
       the UI depends on are documented inline so nothing else needs to
       change — renderSuccess() already reads these exact fields.

     @param {{data:string}} payload  what the visitor typed
     @returns {Promise<{
        timestamp:string,   // ISO-8601 UTC, second-anchored, e.g. "2026-06-13T17:46:42.001Z"
        unix:number,        // unix seconds
        block:number,       // block height (Clockchain mints 1 block / second)
        txHash:string,      // "0x…" on-chain receipt / transaction reference
        contentHash:string, // "sha256:…" hash of the logged data
        status:string       // "verified"
     }>}
     ────────────────────────────────────────────────────────────── */
  async function submitLog(payload){
    var data = (payload && payload.data != null) ? String(payload.data) : '';

    /* === REAL IMPLEMENTATION (uncomment & configure to go live) ============
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + CLOCKCHAIN_API_KEY,   // your key/secret
      },
      body: JSON.stringify({ data: data }),                 // <-- request shape
    });
    if (!res.ok) {
      throw new Error('Request failed (' + res.status + ')');
    }
    return await res.json();                                // <-- response shape (see @returns)
    ======================================================================== */

    /* --- MOCK (remove when going live) ------------------------------------ */
    await wait(820 + Math.random() * 720);
    if (!data.trim()) {
      // surfaces the error state so it can be designed/tested
      throw new Error('Nothing to log \u2014 enter something to anchor to the chain.');
    }
    return mockResponse(data);
    /* ---------------------------------------------------------------------- */
  }

  /* ── mock helpers (delete alongside the MOCK block above) ── */
  function wait(ms){ return new Promise(function(r){ setTimeout(r, ms); }); }

  function mockResponse(data){
    var now = new Date();
    var unix = Math.floor(now.getTime() / 1000);
    return {
      timestamp: now.toISOString(),
      unix: unix,
      block: unix,                                   // 1 block per second
      txHash: '0x' + randomHex(64),                  // receipt is non-deterministic
      contentHash: 'sha256:' + seededHex(data, 64),  // same input → same content hash
      status: 'verified',
      data: data
    };
  }
  function randomHex(n){
    var c = '0123456789abcdef', s = '';
    for (var i = 0; i < n; i++) s += c[Math.floor(Math.random() * 16)];
    return s;
  }
  // deterministic hex string derived from text (looks like a real digest)
  function seededHex(str, n){
    var c = '0123456789abcdef', s = '';
    var h = 2166136261 >>> 0;                        // FNV-1a seed
    for (var i = 0; i < str.length; i++){ h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    for (var j = 0; j < n; j++){ h ^= h << 13; h ^= h >>> 17; h ^= h << 5; h >>>= 0; s += c[h & 15]; }
    return s;
  }

  /* ──────────────────────────────────────────────────────────────
     Code-snippet generation.
     Each builder returns an array of lines; each line is an array of
     [tokenClass, text] pairs. Rendering to HTML (highlighted) and to
     plain text (for copy) both derive from the same tokens, so the
     copied code always matches what's shown.
     ────────────────────────────────────────────────────────────── */
  var KW='tok-kw', STR='tok-str', FN='tok-fn', NUM='tok-num',
      PROP='tok-prop', P='tok-punct', VAR='tok-var', COM='tok-com', T='';

  // JSON-string-escape the user input for display inside double quotes
  function jsonEsc(s){
    return String(s)
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\t/g, '\\t')
      .replace(/\r/g, '');
  }

  var SNIPPETS = {
    curl: function(input){
      var body = '{"data": "' + jsonEsc(input) + '"}';
      return [
        [[FN,'curl'],[T,' '],[P,'-X'],[T,' POST '],[STR,'"'+ENDPOINT+'"'],[T,' \\']],
        [[T,'  '],[P,'-H'],[T,' '],[STR,'"Content-Type: application/json"'],[T,' \\']],
        [[T,'  '],[P,'-H'],[T,' '],[STR,'"Authorization: Bearer $CLOCKCHAIN_API_KEY"'],[T,' \\']],
        [[T,'  '],[P,'-d'],[T,' '],[STR,"'" + body + "'"]]
      ];
    },
    javascript: function(input){
      return [
        [[KW,'const'],[T,' '],[VAR,'res'],[T,' '],[P,'='],[T,' '],[KW,'await'],[T,' '],[FN,'fetch'],[P,'('],[STR,'"'+ENDPOINT+'"'],[P,', {']],
        [[T,'  '],[PROP,'method'],[P,':'],[T,' '],[STR,'"POST"'],[P,',']],
        [[T,'  '],[PROP,'headers'],[P,':'],[T,' '],[P,'{']],
        [[T,'    '],[STR,'"Content-Type"'],[P,':'],[T,' '],[STR,'"application/json"'],[P,',']],
        [[T,'    '],[STR,'"Authorization"'],[P,':'],[T,' '],[STR,'`Bearer ${'],[VAR,'process'],[P,'.'],[PROP,'env'],[P,'.'],[VAR,'CLOCKCHAIN_API_KEY'],[STR,'}`'],[P,',']],
        [[T,'  '],[P,'},']],
        [[T,'  '],[PROP,'body'],[P,':'],[T,' '],[VAR,'JSON'],[P,'.'],[FN,'stringify'],[P,'({'],[T,' '],[PROP,'data'],[P,':'],[T,' '],[STR,'"'+jsonEsc(input)+'"'],[T,' '],[P,'}),']],
        [[P,'});']],
        [[T,'']],
        [[KW,'const'],[T,' '],[VAR,'proof'],[T,' '],[P,'='],[T,' '],[KW,'await'],[T,' '],[VAR,'res'],[P,'.'],[FN,'json'],[P,'();']],
        [[VAR,'console'],[P,'.'],[FN,'log'],[P,'('],[VAR,'proof'],[P,'.'],[PROP,'timestamp'],[P,','],[T,' '],[VAR,'proof'],[P,'.'],[PROP,'block'],[P,');']]
      ];
    },
    python: function(input){
      return [
        [[KW,'import'],[T,' '],[VAR,'requests'],[P,','],[T,' '],[VAR,'os']],
        [[T,'']],
        [[VAR,'res'],[T,' '],[P,'='],[T,' '],[VAR,'requests'],[P,'.'],[FN,'post'],[P,'(']],
        [[T,'    '],[STR,'"'+ENDPOINT+'"'],[P,',']],
        [[T,'    '],[PROP,'headers'],[P,'='],[P,'{'],[STR,'"Authorization"'],[P,':'],[T,' '],[STR,'f"Bearer {'],[VAR,'os'],[P,'.'],[PROP,'environ'],[P,'['],[STR,"'CLOCKCHAIN_API_KEY'"],[P,']'],[STR,'}"'],[P,'},']],
        [[T,'    '],[PROP,'json'],[P,'='],[P,'{'],[STR,'"data"'],[P,':'],[T,' '],[STR,'"'+jsonEsc(input)+'"'],[P,'},']],
        [[P,')']],
        [[T,'']],
        [[VAR,'proof'],[T,' '],[P,'='],[T,' '],[VAR,'res'],[P,'.'],[FN,'json'],[P,'()']],
        [[FN,'print'],[P,'('],[VAR,'proof'],[P,'['],[STR,'"timestamp"'],[P,'],'],[T,' '],[VAR,'proof'],[P,'['],[STR,'"block"'],[P,'])']]
      ];
    }
  };

  function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function linesToHTML(lines){
    return lines.map(function(line){
      var inner = line.map(function(tok){
        var cls = tok[0], txt = esc(tok[1]);
        return cls ? '<span class="'+cls+'">'+txt+'</span>' : txt;
      }).join('');
      return '<span class="ln">'+ (inner || '\u200b') +'</span>';
    }).join('');
  }
  function linesToPlain(lines){
    return lines.map(function(line){
      return line.map(function(tok){ return tok[1]; }).join('');
    }).join('\n');
  }

  /* ── DOM wiring ── */
  document.addEventListener('DOMContentLoaded', function(){
    var input    = document.getElementById('pg-input');
    var runBtn   = document.getElementById('pg-run');
    var result   = document.getElementById('pg-result');
    var codeEl   = document.getElementById('pg-code');
    var copyBtn  = document.getElementById('pg-copy');
    var grid     = document.getElementById('pg-success-grid');
    var workspace= document.getElementById('pg-workspace');
    var tabs     = Array.prototype.slice.call(document.querySelectorAll('.pg-tab'));
    var mtabs    = Array.prototype.slice.call(document.querySelectorAll('.pg-mtab'));
    if(!input || !runBtn || !result || !codeEl) return;

    var lang = 'curl';
    var currentPlain = '';

    if(!input.value) input.value = DEFAULT_INPUT;

    function renderCode(){
      var lines = SNIPPETS[lang](input.value || '');
      codeEl.innerHTML = linesToHTML(lines);
      currentPlain = linesToPlain(lines);
    }

    input.addEventListener('input', renderCode);

    tabs.forEach(function(tab){
      tab.addEventListener('click', function(){
        lang = tab.getAttribute('data-lang');
        tabs.forEach(function(t){ t.setAttribute('aria-selected', String(t === tab)); });
        renderCode();
      });
    });

    if(copyBtn){
      copyBtn.addEventListener('click', function(){
        var done = function(){
          copyBtn.classList.add('copied');
          var label = copyBtn.querySelector('.pg-copy-label');
          var prev = label ? label.textContent : '';
          if(label) label.textContent = 'Copied';
          setTimeout(function(){ copyBtn.classList.remove('copied'); if(label) label.textContent = prev || 'Copy'; }, 1400);
        };
        if(navigator.clipboard && navigator.clipboard.writeText){
          navigator.clipboard.writeText(currentPlain).then(done).catch(fallbackCopy);
        } else { fallbackCopy(); }
        function fallbackCopy(){
          var ta = document.createElement('textarea');
          ta.value = currentPlain; ta.setAttribute('readonly',''); ta.style.position='absolute'; ta.style.left='-9999px';
          document.body.appendChild(ta); ta.select();
          try{ document.execCommand('copy'); done(); }catch(e){}
          document.body.removeChild(ta);
        }
      });
    }

    // mobile Result/Code switcher
    mtabs.forEach(function(mt){
      mt.addEventListener('click', function(){
        var view = mt.getAttribute('data-mview');
        workspace.setAttribute('data-mview', view);
        mtabs.forEach(function(m){ m.setAttribute('aria-selected', String(m === mt)); });
      });
    });
    function showMobileView(view){
      if(!workspace) return;
      workspace.setAttribute('data-mview', view);
      mtabs.forEach(function(m){ m.setAttribute('aria-selected', String(m.getAttribute('data-mview') === view)); });
    }

    function setState(s){
      result.setAttribute('data-state', s);
      var label = result.querySelector('.pg-state-text');
      if(label){
        label.textContent = s === 'loading' ? 'Anchoring…'
          : s === 'success' ? 'Response verified'
          : s === 'error' ? 'Request failed'
          : 'Awaiting request';
      }
    }

    function renderSuccess(d){
      var blockStr = '#' + Number(d.block).toLocaleString();
      grid.innerHTML =
        row('Timestamp (UTC)', esc(d.timestamp), false) +
        row('Block height', esc(blockStr), false) +
        row('Transaction receipt', esc(d.txHash), true, true) +
        row('Content hash', esc(d.contentHash), true, true) +
        row('Logged data', esc(d.data), false, true);
      var foot = document.getElementById('pg-success-foot');
      if(foot){
        foot.innerHTML =
          '<span class="pg-chip">\u25CF '+ esc(cap(d.status)) +'</span>' +
          '<span>Anchored on-chain &middot; independently verifiable</span>';
      }
      function row(label, val, mono, full){
        return '<div class="pg-rrow'+(full?' pg-full':'')+'">'+
                 '<div class="pg-rrow-label">'+label+'</div>'+
                 '<div class="pg-rrow-val'+(mono?' mono':'')+'">'+val+'</div>'+
               '</div>';
      }
      function cap(s){ s=String(s); return s.charAt(0).toUpperCase()+s.slice(1); }
    }

    function renderError(msg){
      var box = document.getElementById('pg-error-msg');
      if(box) box.textContent = msg || 'Something went wrong. Please try again.';
    }

    var running = false;
    async function run(){
      if(running) return;
      running = true;
      runBtn.setAttribute('disabled', '');
      setState('loading');
      showMobileView('result');
      try{
        var data = await submitLog({ data: input.value });
        renderSuccess(data);
        setState('success');
      }catch(err){
        renderError(err && err.message ? err.message : String(err));
        setState('error');
      }finally{
        running = false;
        runBtn.removeAttribute('disabled');
      }
    }

    runBtn.addEventListener('click', run);
    input.addEventListener('keydown', function(e){
      if(e.key === 'Enter' && (e.metaKey || e.ctrlKey)){ e.preventDefault(); run(); }
    });
    var retry = document.getElementById('pg-retry');
    if(retry) retry.addEventListener('click', run);

    // init
    renderCode();
    setState('idle');
  });
})();
