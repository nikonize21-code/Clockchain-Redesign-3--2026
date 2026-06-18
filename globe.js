/* ============================================================
   Clockchain merged — wireframe time-zone globe
   Adapted from the reference site. Theme-aware: reads CSS
   custom props so it recolors with the active variant.
   ============================================================ */
(function(){
  var wrap=document.querySelector('.hero-visual');
  var canvas=document.getElementById('globe-canvas');
  if(!wrap||!canvas)return;

  function cssVar(name,fallback){
    var v=getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v||fallback;
  }
  function isDark(){return document.documentElement.getAttribute('data-variant')==='eclipse';}

  /* major global financial hubs */
  var CAPITALS=[
    {n:'Sydney',lon:151.2,lat:-33.9,tz:10,tzM:150},
    {n:'Tokyo',lon:139.7,lat:35.7,tz:9,tzM:135},
    {n:'Seoul',lon:127.0,lat:37.6,tz:9,tzM:135},
    {n:'Shanghai',lon:121.5,lat:31.2,tz:8,tzM:120},
    {n:'Hong Kong',lon:114.2,lat:22.3,tz:8,tzM:120},
    {n:'Singapore',lon:103.8,lat:1.4,tz:8,tzM:120},
    {n:'Mumbai',lon:72.9,lat:19.1,tz:5.5,tzM:82.5},
    {n:'Dubai',lon:55.3,lat:25.2,tz:4,tzM:60},
    {n:'Frankfurt',lon:8.7,lat:50.1,tz:1,tzM:15},
    {n:'Zurich',lon:8.5,lat:47.4,tz:1,tzM:15},
    {n:'Paris',lon:2.3,lat:48.9,tz:1,tzM:15},
    {n:'London',lon:-0.1,lat:51.5,tz:0,tzM:0},
    {n:'Sao Paulo',lon:-46.6,lat:-23.5,tz:-3,tzM:-45},
    {n:'Toronto',lon:-79.4,lat:43.7,tz:-5,tzM:-75},
    {n:'New York',lon:-74.0,lat:40.7,tz:-5,tzM:-75},
    {n:'Chicago',lon:-87.6,lat:41.9,tz:-6,tzM:-90},
    {n:'San Francisco',lon:-122.4,lat:37.8,tz:-8,tzM:-120}
  ];

  function init(){
    if(typeof THREE==='undefined'){setTimeout(init,80);return;}

    var W=wrap.clientWidth,H=wrap.clientHeight;
    var MOBILE=!!(window.matchMedia&&window.matchMedia('(max-width:760px)').matches);
    var renderer=new THREE.WebGLRenderer({canvas:canvas,antialias:!MOBILE,alpha:true});
    renderer.setPixelRatio(MOBILE?1:Math.min(window.devicePixelRatio,2));
    renderer.setSize(W,H);renderer.setClearColor(0,0);

    var scene=new THREE.Scene();
    var camera=new THREE.PerspectiveCamera(40,W/H,0.1,100);
    camera.position.z=3.79;  /* globe sized ~15% smaller than the prior 3.22 */

    var R=1.0;
    var globe=new THREE.Group();scene.add(globe);

    /* solid fill: subtle dark gradient + faint fresnel edge glow.
       Writes depth so the back-side grid/borders are occluded -> reads as a solid globe.
       Opacity is driven by the Tweaks slider via window.__setGlobeFill(0..1). */
    var sphereMat=new THREE.ShaderMaterial({
      transparent:true,depthWrite:true,depthTest:true,
      uniforms:{
        uOpacity:{value:0.20},
        uCore:{value:new THREE.Color(cssVar('--globe-fill-core','#0c110e'))},
        uEdge:{value:new THREE.Color(cssVar('--globe-fill-edge','#16241c'))},
        uGlow:{value:new THREE.Color(cssVar('--globe-line','#3fc489'))}
      },
      vertexShader:'varying vec3 vN;varying vec3 vV;void main(){vN=normalize(normalMatrix*normal);vec4 mv=modelViewMatrix*vec4(position,1.0);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}',
      fragmentShader:'uniform float uOpacity;uniform vec3 uCore;uniform vec3 uEdge;uniform vec3 uGlow;varying vec3 vN;varying vec3 vV;void main(){float c=max(dot(vN,vV),0.0);float fres=pow(1.0-c,3.0);vec3 col=mix(uEdge,uCore,c)+uGlow*fres*0.55;gl_FragColor=vec4(col,uOpacity);}'
    });
    var sphereMesh=new THREE.Mesh(new THREE.SphereGeometry(R*0.992,64,48),sphereMat);
    sphereMesh.renderOrder=-1;
    globe.add(sphereMesh);
    window.__setGlobeFill=function(v){
      v=Math.max(0,Math.min(1,(typeof v==='number'&&!isNaN(v))?v:0.82));
      sphereMat.uniforms.uOpacity.value=v;
      sphereMat.depthWrite=v>0.12;   /* near-clear -> let the back-side lines show through again */
      sphereMat.needsUpdate=true;
    };
    (function(){var a=parseFloat(document.documentElement.getAttribute('data-globefill'));if(!isNaN(a))window.__setGlobeFill(a/100);})();

    /* line-weight controls (1.0 = a single device pixel). Bump these to thicken. */
    var BLUE_W=1.5;   /* country borders */
    var BLACK_W=1.5;  /* equator + timezone boundary meridians */
    var fatMats=[];   /* LineMaterials needing resolution kept in sync on resize */

    var cGreen=new THREE.Color(cssVar('--globe-line','#3fc489'));
    var cGlow=new THREE.Color('#9bf2c4');
    var cGrid=new THREE.Color(cssVar('--globe-grid','#3fc489'));
    var cBase=new THREE.Color(cssVar('--globe-base','#1d1d1f'));
    var cLand=new THREE.Color(cssVar('--globe-land','#9fb8cf'));

    window.__recolorGlobe=function(){
      cGreen.set(cssVar('--globe-line','#3fc489'));
      cGrid.set(cssVar('--globe-grid','#3fc489'));
      cBase.set(cssVar('--globe-base','#1d1d1f'));
      cLand.set(cssVar('--globe-land','#9fb8cf'));
      countryMats.forEach(function(m){m.color.copy(cLand);});
      sphereMat.uniforms.uGlow.value.set(cssVar('--globe-line','#3fc489'));
    };

    function ll2v(lon,lat,r){
      r=r||R;var lo=lon*Math.PI/180,la=lat*Math.PI/180;
      return new THREE.Vector3(r*Math.cos(la)*Math.cos(lo),r*Math.sin(la),-r*Math.cos(la)*Math.sin(lo));
    }

    /* thick line via Line2/LineMaterial (LineBasicMaterial.linewidth is ignored by WebGL) */
    function makeFatLine(points,color,opacity,linewidth){
      var arr=[];
      for(var i=0;i<points.length;i++){arr.push(points[i].x,points[i].y,points[i].z);}
      var geo=new THREE.LineGeometry();geo.setPositions(arr);
      var mat=new THREE.LineMaterial({color:color.getHex(),transparent:true,opacity:opacity,linewidth:linewidth});
      mat.resolution.set(W,H);
      fatMats.push(mat);
      return {line:new THREE.Line2(geo,mat),mat:mat};
    }

    /* latitude rings */
    for(var latD=-89;latD<=89;latD+=1){
      if(Math.abs(latD)===90)continue;
      if(latD===23||latD===-23||latD===66||latD===-66)continue;
      var phi=latD*Math.PI/180,cosP=Math.cos(phi),sinP=Math.sin(phi),rr=R*cosP;
      var pts=[];for(var i=0;i<=180;i++){var t=(i/180)*Math.PI*2;pts.push(new THREE.Vector3(rr*Math.cos(t),R*sinP,rr*Math.sin(t)));}
      var isEq=(latD===0),isMaj=(latD%10===0);
      if(MOBILE&&!isEq&&!isMaj)continue;
      if(isEq){
        globe.add(makeFatLine(pts,cBase,0.7,BLACK_W).line);
      }else{
        globe.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:cGrid,transparent:true,opacity:isMaj?0.18:0.07})));
      }
    }

    /* meridians + tz boundaries */
    var meridians=[];
    for(var lonD=-180;lonD<180;lonD+=1){
      var lonR=lonD*Math.PI/180,pts2=[];
      for(var i2=0;i2<=180;i2++){var a=(i2/180)*Math.PI*2;pts2.push(new THREE.Vector3(R*Math.sin(a)*Math.cos(lonR),R*Math.cos(a),-R*Math.sin(a)*Math.sin(lonR)));}
      var isTZ=(((lonD+180)%15)===0),isMaj2=(lonD%10===0);
      if(MOBILE&&!isTZ&&!isMaj2)continue;
      if(isTZ){
        var fl=makeFatLine(pts2,cBase,0.7,BLACK_W);
        globe.add(fl.line);
        meridians.push({mat:fl.mat,lonDeg:lonD,isTZ:true});
      }else{
        var gm=new THREE.LineBasicMaterial({color:cGrid.clone(),transparent:true,opacity:isMaj2?0.16:0.06});
        globe.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts2),gm));
        meridians.push({mat:gm,lonDeg:lonD,isTZ:false,major:isMaj2});
      }
    }

    /* country borders */
    var countryMats=[];
    function addPolyLine(coords){
      if(!coords||coords.length<2)return;
      var lats=coords.map(function(c){return c[1];});
      if(Math.max.apply(null,lats)-Math.min.apply(null,lats)<(MOBILE?5.0:2.0))return;
      var pts=[];
      for(var i=0;i<coords.length;i++){
        if(i>0){
          var p0=coords[i-1],p1=coords[i];
          var steps=Math.max(1,Math.round(Math.sqrt(Math.pow(p1[0]-p0[0],2)+Math.pow(p1[1]-p0[1],2))/(MOBILE?3.5:1.5)));
          for(var s=(i===1?0:1);s<=steps;s++){var t=s/steps;pts.push(ll2v(p0[0]+(p1[0]-p0[0])*t,p0[1]+(p1[1]-p0[1])*t));}
        }
      }
      if(pts.length<2)return;
      var fl=makeFatLine(pts,cLand,0.92,BLUE_W);
      globe.add(fl.line);
      countryMats.push(fl.mat);
    }
    fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
      .then(function(r){return r.json();})
      .then(function(topo){
        var sc=topo.transform.scale,tr=topo.transform.translate,arcs=topo.arcs;
        function decodeArc(idx){var rev=idx<0,raw=arcs[rev?~idx:idx],out=[],x=0,y=0;for(var i=0;i<raw.length;i++){x+=raw[i][0];y+=raw[i][1];out.push([x*sc[0]+tr[0],y*sc[1]+tr[1]]);}if(rev)out.reverse();return out;}
        function stitchRing(idxs){var pts=[];idxs.forEach(function(idx,i){var a=decodeArc(idx);pts=pts.concat(i===0?a:a.slice(1));});return pts;}
        topo.objects.countries.geometries.forEach(function(geom){
          if(geom.type==='Polygon')geom.arcs.forEach(function(r){addPolyLine(stitchRing(r));});
          else if(geom.type==='MultiPolygon')geom.arcs.forEach(function(p){p.forEach(function(r){addPolyLine(stitchRing(r));});});
        });
      }).catch(function(e){console.warn('topo fail',e);});

    /* label overlay */
    var labelCanvas=document.createElement('canvas');
    labelCanvas.style.cssText='position:absolute;top:0;left:0;pointer-events:none;';
    wrap.style.position='relative';wrap.appendChild(labelCanvas);
    var lctx=labelCanvas.getContext('2d');
    var dpr=window.devicePixelRatio||1;
    function resizeAll(){
      W=wrap.clientWidth;H=wrap.clientHeight;
      renderer.setSize(W,H);camera.aspect=W/H;camera.updateProjectionMatrix();
      for(var fi=0;fi<fatMats.length;fi++){fatMats[fi].resolution.set(W,H);}
      labelCanvas.width=Math.floor(W*dpr);labelCanvas.height=Math.floor(H*dpr);
      labelCanvas.style.width=W+'px';labelCanvas.style.height=H+'px';
      lctx.setTransform(dpr,0,0,dpr,0,0);
    }
    resizeAll();window.addEventListener('resize',resizeAll);

    function project(v3){var v=v3.clone().project(camera);return {x:(v.x*0.5+0.5)*W,y:(-v.y*0.5+0.5)*H,z:v.z};}

    var autoSpeed=-0.0000148,lastT=null,lastDraw=0;
    function getUTCDecimalHour(){var n=new Date();return n.getUTCHours()+n.getUTCMinutes()/60+n.getUTCSeconds()/3600+n.getUTCMilliseconds()/3600000;}
    function formatTime(utcH,tz){var h=((utcH+tz)%24+24)%24;var hh=Math.floor(h),mm=Math.floor((h-hh)*60);var ap=hh>=12?'PM':'AM',h12=hh%12||12;return (h12<10?'0':'')+h12+':'+(mm<10?'0':'')+mm+' '+ap;}

    function animate(ts){
      requestAnimationFrame(animate);
      if(MOBILE&&lastDraw&&ts-lastDraw<33){return;}
      lastDraw=ts;
      if(lastT===null)lastT=ts;var dt=ts-lastT;lastT=ts;
      globe.rotation.y+=autoSpeed*dt;var gy=globe.rotation.y;

      for(var i=0;i<meridians.length;i++){
        var m=meridians[i];var lonRad=m.lonDeg*Math.PI/180;
        var worldZ=-Math.sin(lonRad+gy),facing=Math.max(0,worldZ),hi=facing*facing,backDim=Math.max(0.18,1.0-facing*1.4);
        if(m.isTZ){
          if(facing>0.05){m.mat.color.copy(cGreen).lerp(cGlow,hi);m.mat.opacity=0.16+facing*0.8;}
          else{m.mat.color.copy(cBase);m.mat.opacity=0.7*backDim;}
        }else{
          var base=m.major?0.16:0.06;
          if(facing>0.05){m.mat.color.copy(cGreen).lerp(cGlow,hi);m.mat.opacity=base+facing*(0.85-base);}
          else{m.mat.color.copy(cGrid);m.mat.opacity=base*backDim;}
        }
      }

      renderer.render(scene,camera);

      lctx.setTransform(dpr,0,0,dpr,0,0);lctx.clearRect(0,0,W,H);
      var utcH=getUTCDecimalHour();
      var dark=isDark();
      var pillBg=dark?'rgba(20,26,23,0.92)':'rgba(255,255,255,0.94)';
      var nameCol=dark?'#f3f5f4':'#1d1d1f';
      var tzCol=dark?'rgba(255,255,255,0.5)':'#86868b';
      var accentCol=cssVar('--accent','#2d7a4f');

      /* ---- globe screen geometry (for parking back-side labels on the rim) ---- */
      var gc=project(new THREE.Vector3(0,0,0));
      var gTop=project(new THREE.Vector3(0,R,0));
      var Rpx=Math.max(1,Math.abs(gTop.y-gc.y));

      /* ---- PASS 1: every hub stays on screen; back-side hubs glide along the rim ---- */
      var visLabels=[];
      CAPITALS.forEach(function(cap){
        var worldPt=ll2v(cap.lon,cap.lat,R).applyEuler(globe.rotation);
        var facing=worldPt.z/R;                 /* 1 = dead-centre front, -1 = far side */
        var sp=project(worldPt);
        var side=(worldPt.x>=0)?'right':'left';
        var dotX,dotY=sp.y,opX;
        if(facing>=0){
          dotX=sp.x;dotY=sp.y;
          var op=project(ll2v(cap.lon,cap.lat,R*1.18).applyEuler(globe.rotation));
          opX=op.x;
        }else{
          /* park on the silhouette at this latitude height */
          var dy=Math.max(-Rpx,Math.min(Rpx,sp.y-gc.y));
          var edgeX=Math.sqrt(Math.max(0,Rpx*Rpx-dy*dy));
          dotX=gc.x+(side==='right'?edgeX:-edgeX);
          dotY=gc.y+dy;
          opX=dotX+(side==='right'?8:-8);
        }
        var alpha=0.4+0.6*Math.max(0,Math.min(1,(facing+0.35)/0.7));
        var timeStr=formatTime(utcH,cap.tz);
        var tzH=Math.trunc(cap.tz),tzMin=Math.round(Math.abs(cap.tz-tzH)*60);
        var tzStr='UTC'+(cap.tz>=0?'+':'-')+Math.abs(tzH)+(tzMin?':'+(tzMin<10?'0':'')+tzMin:'');
        var anchor=(side==='right')?'left':'right';
        lctx.font='bold 10px Inter,sans-serif';var nameW=lctx.measureText(cap.n).width;
        lctx.font='9px Inter,sans-serif';var timeW=lctx.measureText(timeStr).width,tzW=lctx.measureText(tzStr).width;
        var boxW=Math.max(nameW,timeW,tzW)+14,boxH=42;
        visLabels.push({
          n:cap.n,sp:{x:dotX,y:dotY},alpha:alpha,timeStr:timeStr,tzStr:tzStr,anchor:anchor,
          boxW:boxW,boxH:boxH,
          bx:anchor==='left'?opX+4:opX-4-boxW,
          by:dotY-boxH/2
        });
      });

      /* ---- PASS 2: de-clutter — stack overlapping labels into a tidy column per side ---- */
      var LPAD=6,LGAP=6;
      ['left','right'].forEach(function(side){
        var col=visLabels.filter(function(l){return l.anchor===side;});
        col.sort(function(a,b){return a.by-b.by;});
        for(var i=0;i<col.length;i++){
          col[i].by=Math.max(LPAD,Math.min(col[i].by,H-col[i].boxH-LPAD));
          if(i>0&&col[i].by<col[i-1].by+col[i-1].boxH+LGAP){col[i].by=col[i-1].by+col[i-1].boxH+LGAP;}
        }
        if(col.length){
          var over=(col[col.length-1].by+col[col.length-1].boxH+LPAD)-H;
          if(over>0){for(var k=0;k<col.length;k++){col[k].by=Math.max(LPAD,col[k].by-over);}}
        }
        col.forEach(function(l){l.bx=Math.max(LPAD,Math.min(l.bx,W-l.boxW-LPAD));});
      });

      /* ---- PASS 3: draw leader lines + pills ---- */
      visLabels.forEach(function(l){
        var a=l.alpha,rx=6,bx=l.bx,by=l.by,boxW=l.boxW,boxH=l.boxH;
        var cx=l.anchor==='left'?bx:bx+boxW,cy=by+boxH/2;
        lctx.globalAlpha=a*0.85;lctx.strokeStyle=accentCol;lctx.lineWidth=1;lctx.setLineDash([2,3]);
        lctx.beginPath();lctx.moveTo(l.sp.x,l.sp.y);lctx.lineTo(cx,cy);lctx.stroke();lctx.setLineDash([]);
        lctx.fillStyle=accentCol;lctx.beginPath();lctx.arc(l.sp.x,l.sp.y,2.5,0,Math.PI*2);lctx.fill();

        lctx.beginPath();
        lctx.moveTo(bx+rx,by);lctx.lineTo(bx+boxW-rx,by);lctx.arcTo(bx+boxW,by,bx+boxW,by+rx,rx);
        lctx.lineTo(bx+boxW,by+boxH-rx);lctx.arcTo(bx+boxW,by+boxH,bx+boxW-rx,by+boxH,rx);
        lctx.lineTo(bx+rx,by+boxH);lctx.arcTo(bx,by+boxH,bx,by+boxH-rx,rx);
        lctx.lineTo(bx,by+rx);lctx.arcTo(bx,by,bx+rx,by,rx);lctx.closePath();
        lctx.fillStyle=pillBg;lctx.strokeStyle=accentCol;lctx.lineWidth=1;
        lctx.globalAlpha=a*0.5;lctx.stroke();lctx.globalAlpha=a*0.94;lctx.fill();

        lctx.fillStyle=nameCol;lctx.font='bold 10px Inter,sans-serif';lctx.textAlign='left';lctx.fillText(l.n,bx+7,by+13);
        lctx.fillStyle=accentCol;lctx.font='bold 11px Inter,sans-serif';lctx.fillText(l.timeStr,bx+7,by+26);
        lctx.fillStyle=tzCol;lctx.font='9px Inter,sans-serif';lctx.fillText(l.tzStr,bx+7,by+38);
        lctx.globalAlpha=1;
      });
    }
    requestAnimationFrame(animate);
  }
  init();
})();
