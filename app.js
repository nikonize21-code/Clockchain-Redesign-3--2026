/* Clockchain merged — page logic: live clock, reveal, news modal */
(function(){
  function pad(n){return String(n).padStart(2,'0');}
  function tick(){
    var now=new Date();
    var h=pad(now.getUTCHours()),m=pad(now.getUTCMinutes()),s=pad(now.getUTCSeconds());
    var epoch=Math.floor(now.getTime()/1000);
    var utcStr=h+':'+m+':'+s+' UTC';
    var elU=document.getElementById('t-utc'); if(elU)elU.textContent=utcStr;
    ['t-height','bc-height'].forEach(function(id){var e=document.getElementById(id);if(e)e.textContent='#'+epoch.toLocaleString();});
    var ts=document.getElementById('bc-ts');
    if(ts){var d=now.getUTCFullYear()+'-'+pad(now.getUTCMonth()+1)+'-'+pad(now.getUTCDate());ts.textContent=d+' '+utcStr;}
    var hash=document.getElementById('bc-hash');
    if(hash){var c='0123456789abcdef',str='0x';for(var i=0;i<16;i++)str+=c[Math.floor(Math.random()*16)];hash.textContent=str+'…';}
  }
  setInterval(tick,1000);tick();

  /* reveal on scroll */
  var obs=new IntersectionObserver(function(entries){
    entries.forEach(function(en){if(en.isIntersecting){en.target.classList.add('in');obs.unobserve(en.target);}});
  },{threshold:0.08});
  document.querySelectorAll('.reveal').forEach(function(el){obs.observe(el);});

  /* nav: add .scrolled once the page leaves the very top */
  var navEl=document.querySelector('.nav');
  if(navEl){
    var onScroll=function(){
      if(window.scrollY>24)navEl.classList.add('scrolled');
      else navEl.classList.remove('scrolled');
    };
    window.addEventListener('scroll',onScroll,{passive:true});
    onScroll();
  }

  /* mobile menu toggle (hamburger → full-screen slide-in) */
  var burger=document.getElementById('nav-burger');
  var mobileMenu=document.getElementById('mobile-menu');
  if(burger&&mobileMenu){
    var setMenu=function(open){
      document.body.classList.toggle('menu-open',open);
      burger.setAttribute('aria-expanded',open?'true':'false');
      burger.setAttribute('aria-label',open?'Close menu':'Open menu');
      mobileMenu.setAttribute('aria-hidden',open?'false':'true');
      document.body.style.overflow=open?'hidden':'';
    };
    burger.addEventListener('click',function(){setMenu(!document.body.classList.contains('menu-open'));});
    mobileMenu.querySelectorAll('a').forEach(function(a){a.addEventListener('click',function(){setMenu(false);});});
    document.addEventListener('keydown',function(e){if(e.key==='Escape'&&document.body.classList.contains('menu-open'))setMenu(false);});
    window.addEventListener('resize',function(){if(window.innerWidth>860&&document.body.classList.contains('menu-open'))setMenu(false);});
  }

  /* nav: Connect dropdown — click to toggle, outside-click + Escape to close, arrow-key nav */
  var connect=document.querySelector('[data-connect]');
  if(connect){
    var cTrigger=connect.querySelector('.nav-connect-trigger');
    var cMenu=connect.querySelector('.nav-connect-menu');
    var cItems=Array.prototype.slice.call(connect.querySelectorAll('[role="menuitem"]'));
    var setConnect=function(open,focusFirst){
      connect.classList.toggle('open',open);
      cTrigger.setAttribute('aria-expanded',open?'true':'false');
      if(open&&focusFirst&&cItems[0])cItems[0].focus();
    };
    var isOpen=function(){return connect.classList.contains('open');};
    cTrigger.addEventListener('click',function(e){e.stopPropagation();setConnect(!isOpen(),true);});
    cTrigger.addEventListener('keydown',function(e){
      if(e.key==='ArrowDown'){e.preventDefault();setConnect(true,true);}
    });
    document.addEventListener('click',function(e){if(isOpen()&&!connect.contains(e.target))setConnect(false);});
    connect.addEventListener('keydown',function(e){
      if(e.key==='Escape'){if(isOpen()){e.preventDefault();setConnect(false);cTrigger.focus();}return;}
      if(e.key==='ArrowDown'||e.key==='ArrowUp'){
        var idx=cItems.indexOf(document.activeElement);
        if(idx===-1)return;
        e.preventDefault();
        var next=e.key==='ArrowDown'?(idx+1)%cItems.length:(idx-1+cItems.length)%cItems.length;
        cItems[next].focus();
      }
    });
    cItems.forEach(function(a){a.addEventListener('click',function(){setTimeout(function(){setConnect(false);},0);});});
  }

  if(window.matchMedia&&window.matchMedia('(max-width:760px)').matches){
    var hv=document.querySelector('.hero-video');
    if(hv){try{hv.pause();}catch(e){} hv.removeAttribute('autoplay');hv.removeAttribute('src');try{hv.load();}catch(e){} hv.remove();}
  }

  /* scroll progress bar: rAF-throttled, recalculated on resize/orientation */
  var progressEl=document.getElementById('scroll-progress');
  if(progressEl){
    var progTicking=false;
    var updateProgress=function(){
      var doc=document.documentElement;
      var body=document.body;
      var scrollTop=window.pageYOffset||doc.scrollTop||body.scrollTop||0;
      var scrollHeight=Math.max(doc.scrollHeight,body.scrollHeight);
      var clientHeight=window.innerHeight||doc.clientHeight;
      var scrollable=scrollHeight-clientHeight;
      var p=scrollable>0?scrollTop/scrollable:0;
      if(p<0)p=0;if(p>1)p=1;
      progressEl.style.transform='scaleX('+p+')';
      progTicking=false;
    };
    var requestProgress=function(){
      if(!progTicking){progTicking=true;requestAnimationFrame(updateProgress);}
    };
    window.addEventListener('scroll',requestProgress,{passive:true});
    document.addEventListener('scroll',requestProgress,{passive:true,capture:true});
    window.addEventListener('resize',requestProgress,{passive:true});
    window.addEventListener('orientationchange',requestProgress);
    window.addEventListener('load',updateProgress);
    updateProgress();
  }

  /* news / media modal */
  var ARTICLES={
    'pr-testnet-2026':{source:'Press Release',date:'February 24, 2026',tag:'Latest release',title:'Clockchain Opens Public Testnet, Introducing a New Blockchain-Based Global Time Standard',body:['The world\u2019s first blockchain-based time oracle is now open to developers. Clockchain combines atomic-clock precision with on-chain verifiability, producing a cryptographically signed timestamp every second.','The public testnet exposes three foundational services: secure timestamping and logging, smart-contract scheduling and execution, and a verifiable Timestamp API. Developers can begin integrating today.']},
    'pr-eth-polygon-2025':{source:'Press Release',date:'June 3, 2025',tag:'Smart contracts',title:'Clockchain to Schedule and Execute Smart Contracts on Ethereum and Polygon',body:['Clockchain announced verifiable time triggers for Ethereum and Polygon, letting developers schedule and execute smart contracts with cryptographic proof of execution time.']},
    'pr-time-oracle-2025':{source:'Press Release',date:'January 22, 2025',tag:'Time oracle',title:'Clockchain Network Announces New Time Oracle',body:['The Clockchain time oracle supplies secure, verifiable Earth Time to autonomous systems, exchanges, blockchains, and metaverse applications through a simple API.']},
    'pr-sf-tech-week-2024':{source:'Press Release',date:'October 16, 2024',tag:'Event',title:'Clockchain Network Unveils New Timestamping Solutions at SF Tech Week',body:['At SF Tech Week, Clockchain demonstrated one-second-accurate, on-chain-provable timestamping for real estate closings, financial transactions, supply-chain events, and legal proceedings.']},
    'pr-patent-2024':{source:'Press Release',date:'August 13, 2024',tag:'Patent',title:'Clockchain Awarded Patent for World\u2019s First Blockchain Clock',body:['Clockchain received a patent (US 12,022,015) covering its method for producing a verifiable, immutable, blockchain-native time standard.']},
    'pr-european-forum-2024':{source:'Press Release',date:'June 24, 2024',tag:'Event',title:'D4D Clockchain Technology Debuts at European Timekeeping Forum',body:['D4D presented the Clockchain protocol to national time institutes and standards bodies at the European Timekeeping Forum.']},
    'blockzeit-testnet':{source:'Blockzeit',date:'Feb 24, 2026',tag:'Featured coverage',title:'Clockchain Launches Public Testnet — Here\u2019s What It Offers',body:['Blockzeit profiles the public testnet launch and the three foundational services now live for developers.'],ext:'#'},
    'mexc-testnet':{source:'MEXC',date:'Feb 24, 2026',tag:'Exchange coverage',title:'Clockchain Unveils Testnet for Verifiable Blockchain Time',body:['MEXC covers the testnet launch for verifiable, decentralized blockchain time.'],ext:'#'},
    'blockchainwire-testnet':{source:'Blockchain Wire',date:'Feb 24, 2026',tag:'Press release',title:'Clockchain Opens Public Testnet — A New Blockchain-Based Global Time Standard',body:['Blockchain Wire distributes the official testnet announcement.'],ext:'#'}
  };
  var modal=document.getElementById('amodal');
  /* real external article URLs — press releases & media open the actual source, like the live site */
  var EXT={
    'pr-testnet-2026':'https://www.blockchainwire.io/press-release/clockchain-opens-public-testnet-introducing-a-new-blockchain-based-global-time-standard',
    'pr-eth-polygon-2025':'https://www.einpresswire.com/article/818495889/clockchain-to-schedule-and-execute-smart-contracts-on-ethereum-and-polygon',
    'pr-time-oracle-2025':'https://www.einpresswire.com/article/778900186/clockchain-network-announces-new-time-oracle',
    'pr-sf-tech-week-2024':'https://www.einpresswire.com/article/752264416/clockchain-network-unveils-new-timestamping-solutions-at-sf-tech-week',
    'pr-patent-2024':'https://www.einpresswire.com/article/732597207/clockchain-awarded-patent-for-world-s-first-blockchain-clock',
    'pr-european-forum-2024':'https://www.prweb.com/releases/d4d-clockchain-technology-debuts-at-european-timekeeping-forum-302178744.html',
    'blockzeit-testnet':'https://blockzeit.com/clockchain-launches-public-testnet-heres-what-it-offers/',
    'mexc-testnet':'https://www.mexc.co/news/786064',
    'blockchainwire-testnet':'https://www.blockchainwire.io/press-release/clockchain-opens-public-testnet-introducing-a-new-blockchain-based-global-time-standard',
    'medium-verifiable-time':'https://medium.com/@victoruzogba/the-role-of-verifiable-time-in-smart-contract-execution-7384b1394bb4',
    'neuchatel-web3':'https://neuchateleconomie.ch/clockchain-revolutionner-la-securite-du-temps-dans-lecosysteme-web3-0/',
    'cointrust-patent':'https://www.cointrust.com/market-news/d4d-sarls-innovative-blockchain-clock-secures-key-patent',
    'companyglance-patent':'https://companyglance.com/news/d4d-sarl-gains-patent-for-clockchain-groundbreaking-blockchain-clock',
    'companyglance-unveils':'https://companyglance.com/news/d4d-sarl-unveils-clockchain-technology'
  };
  function openArticle(id){
    var a=ARTICLES[id];if(!a||!modal)return;
    document.getElementById('am-source').textContent=a.source;
    document.getElementById('am-date').textContent=a.date;
    document.getElementById('am-tag').textContent=a.tag;
    document.getElementById('am-title').textContent=a.title;
    document.getElementById('am-content').innerHTML=a.body.map(function(p){return '<p>'+p+'</p>';}).join('');
    modal.classList.add('open');document.body.style.overflow='hidden';
  }
  function closeArticle(){if(modal){modal.classList.remove('open');document.body.style.overflow='';}}
  document.querySelectorAll('[data-article]').forEach(function(el){
    el.style.cursor='pointer';
    el.setAttribute('role','link');
    el.setAttribute('tabindex','0');
    function go(){
      var id=el.getAttribute('data-article');
      var url=EXT[id];
      if(url){window.open(url,'_blank','noopener,noreferrer');}
      else{openArticle(id);}
    }
    el.addEventListener('click',go);
    el.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();go();}});
  });
  if(modal){
    modal.querySelectorAll('[data-close]').forEach(function(b){b.addEventListener('click',closeArticle);});
    document.addEventListener('keydown',function(e){if(e.key==='Escape')closeArticle();});
  }

  /* embed mode: report height to the compare host (cross-origin safe) */
  if(window.__EMBED && window.parent !== window){
    var postH=function(){
      var h=Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
      window.parent.postMessage({type:'cc-embed-height', height:h}, '*');
    };
    window.addEventListener('load', postH);
    window.addEventListener('resize', postH);
    [400,1000,2200,3500].forEach(function(d){setTimeout(postH,d);});
    postH();
  }
})();
