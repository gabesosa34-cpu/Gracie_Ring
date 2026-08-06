(function(){
"use strict";
var h = React.createElement;
var useState = React.useState;
var useMemo = React.useMemo;
var useRef = React.useRef;
var useEffect = React.useEffect;

/* ============================================================
   DATA
   ============================================================ */
var SHAPES = [
  { id:'round',    label:'Round' },
  { id:'oval',     label:'Oval' },
  { id:'emerald',  label:'Emerald' },
  { id:'princess', label:'Princess' },
  { id:'pear',     label:'Pear' },
  { id:'cushion',  label:'Cushion' },
  { id:'marquise', label:'Marquise' }
];

var GEM_BOX = {
  round:    { w:1.00, h:1.00 },
  oval:     { w:0.72, h:1.00 },
  emerald:  { w:0.66, h:0.92 },
  princess: { w:0.86, h:0.86 },
  pear:     { w:0.74, h:1.00 },
  cushion:  { w:0.88, h:0.88 },
  marquise: { w:0.50, h:1.06 }
};

/* Pricing (SETTINGS/METALS/BAND_STYLES) lives in pricing.js, and the
   diamond inventory lives in diamonds.js — both loaded before this
   script. Swap either file's contents for real data without touching
   anything below; see the schema comments in those files. */
var SETTINGS = window.GraciePricing.SETTINGS;
var METALS = window.GraciePricing.METALS;
var BAND_STYLES = window.GraciePricing.BAND_STYLES;
var DIAMONDS = window.GracieDiamonds;

/* Band Design (profile/width/detail/engraving) — for the engagement
   ring's own band, distinct from BAND_STYLES above (the optional
   separate matching wedding band). Same swap seam as the rest. */
var BAND_PROFILES = window.GraciePricing.BAND_PROFILES;
var BAND_DETAILS = window.GraciePricing.BAND_DETAILS;
var BAND_WIDTH_CFG = window.GraciePricing.BAND_WIDTH;
var ENGRAVING_FEE = window.GraciePricing.ENGRAVING_FEE;

var CARAT_MIN = 0.40, CARAT_MAX = 3.20, PRICE_CEIL = 70000;

/* ============================================================
   HELPERS
   ============================================================ */
function fmtMoney(n){ return '$' + Math.round(n).toLocaleString('en-US'); }
function shapeLabel(id){ var s = SHAPES.filter(function(x){return x.id===id;})[0]; return s ? s.label : id; }
function findSetting(id){ return SETTINGS.filter(function(x){return x.id===id;})[0] || null; }
function findMetal(id){ return METALS.filter(function(x){return x.id===id;})[0] || null; }
function findBand(id){ return BAND_STYLES.filter(function(x){return x.id===id;})[0] || null; }
function findBandProfile(id){ return BAND_PROFILES.filter(function(x){return x.id===id;})[0] || null; }
function findBandDetail(id){ return BAND_DETAILS.filter(function(x){return x.id===id;})[0] || null; }

function caratScale(carat){
  var c = Math.max(CARAT_MIN, Math.min(CARAT_MAX, carat || 1));
  var t = (c - CARAT_MIN) / (CARAT_MAX - CARAT_MIN);
  return 0.74 + t * 0.82;
}

/* Shared layout math for the ring preview: where the center gem sits
   within RingScene's viewBox, so the 3D overlay (RingStage, below)
   can line up a canvas over the same spot without duplicating
   RingScene's own gw/gh/position logic. */
function gemFrame(shape, carat, bandOn){
  var scale = caratScale(carat);
  var box = GEM_BOX[shape] || GEM_BOX.round;
  var unit = 24;
  return { viewW:300, viewH: bandOn?428:300, cx:150, cy:100, gw:box.w*unit*scale, gh:box.h*unit*scale };
}

/* Real-world 1ct anchor mm dimensions, mirroring diamond3d.js's
   SHAPE_DIMS_1CT — kept separate since this side only needs it for
   the caption text, not full geometry. */
var SHAPE_DIMS_1CT = {
  round:{length:6.5,width:6.5}, oval:{length:7.7,width:5.7}, emerald:{length:7.0,width:5.0},
  princess:{length:5.5,width:5.5}, pear:{length:8.0,width:5.3}, cushion:{length:6.0,width:6.0},
  marquise:{length:9.0,width:4.5}
};
function shapeDimsLabel(shape, carat){
  var a = SHAPE_DIMS_1CT[shape] || SHAPE_DIMS_1CT.round;
  var s = Math.pow(Math.max(0.2, carat||1), 1/3);
  return (a.length*s).toFixed(2) + ' × ' + (a.width*s).toFixed(2) + ' mm';
}

/* ============================================================
   GEOMETRY / GEM BUILDERS
   ============================================================ */
function pt(x,y){ return x.toFixed(2) + ',' + y.toFixed(2); }
function polyStr(pts){ return pts.map(function(p){ return pt(p[0],p[1]); }).join(' '); }
function scalePts(pts,s){ return pts.map(function(p){ return [p[0]*s, p[1]*s]; }); }
function ellipseOutline(rx,ry,n){
  var pts = [];
  for (var i=0;i<n;i++){
    var t = -Math.PI/2 + (Math.PI*2*i)/n;
    pts.push([rx*Math.cos(t), ry*Math.sin(t)]);
  }
  return pts;
}

function gemFills(uid){
  return { outer:{ fill:'url(#gemBrilliance-'+uid+')' }, table:{ fill:'url(#gemTableShine-'+uid+')' } };
}

function gemRadial(w,hh,n,tableScale,spokeStep,detailed,keyBase,uid){
  var fills = gemFills(uid);
  var outer = ellipseOutline(w,hh,n);
  var table = scalePts(outer, tableScale);
  var kids = [h('polygon',{ points:polyStr(outer), className:'gem-outer', style:fills.outer, key:keyBase+'-o' })];
  if (detailed){
    for (var i=0;i<n;i+=spokeStep){
      kids.push(h('line',{ x1:outer[i][0], y1:outer[i][1], x2:table[i][0], y2:table[i][1], className:'gem-facet', key:keyBase+'-f'+i }));
    }
  }
  kids.push(h('polygon',{ points:polyStr(table), className:'gem-table', style:fills.table, key:keyBase+'-t' }));
  return kids;
}

function gemPrincess(w,hh,detailed,keyBase,uid){
  var fills = gemFills(uid);
  var outer = [[w,-hh],[w,hh],[-w,hh],[-w,-hh]];
  var table = scalePts(outer, 0.46);
  var kids = [h('polygon',{ points:polyStr(outer), className:'gem-outer', style:fills.outer, key:keyBase+'-o' })];
  if (detailed){
    kids.push(h('line',{ x1:outer[0][0], y1:outer[0][1], x2:outer[2][0], y2:outer[2][1], className:'gem-facet', key:keyBase+'-d1' }));
    kids.push(h('line',{ x1:outer[1][0], y1:outer[1][1], x2:outer[3][0], y2:outer[3][1], className:'gem-facet', key:keyBase+'-d2' }));
  }
  kids.push(h('polygon',{ points:polyStr(table), className:'gem-table', style:fills.table, key:keyBase+'-t' }));
  return kids;
}

function gemCushion(w,hh,detailed,keyBase,uid){
  var fills = gemFills(uid);
  var r = Math.min(w,hh) * 0.34;
  var kids = [h('rect',{ x:-w, y:-hh, width:w*2, height:hh*2, rx:r, ry:r, className:'gem-outer', style:fills.outer, key:keyBase+'-o' })];
  if (detailed){
    var corners = [[w*0.84,-hh*0.84],[w*0.84,hh*0.84],[-w*0.84,hh*0.84],[-w*0.84,-hh*0.84]];
    var inner = scalePts(corners, 0.5);
    corners.forEach(function(c,i){
      kids.push(h('line',{ x1:c[0], y1:c[1], x2:inner[i][0], y2:inner[i][1], className:'gem-facet', key:keyBase+'-c'+i }));
    });
  }
  var ri = r*0.55;
  kids.push(h('rect',{ x:-w*0.48, y:-hh*0.48, width:w*0.96, height:hh*0.96, rx:ri, ry:ri, className:'gem-table', style:fills.table, key:keyBase+'-t' }));
  return kids;
}

function chamferPts(w,hh,c){
  return [
    [w-c,-hh],[w,-hh+c],
    [w,hh-c],[w-c,hh],
    [-(w-c),hh],[-w,hh-c],
    [-w,-hh+c],[-(w-c),-hh]
  ];
}
function gemEmerald(w,hh,detailed,keyBase,uid){
  var fills = gemFills(uid);
  var m = Math.min(w,hh);
  var kids = [h('polygon',{ points:polyStr(chamferPts(w,hh,m*0.32)), className:'gem-outer', style:fills.outer, key:keyBase+'-o' })];
  if (detailed){
    kids.push(h('polygon',{ points:polyStr(chamferPts(w*0.78,hh*0.78,m*0.26)), className:'gem-step', key:keyBase+'-s' }));
  }
  kids.push(h('polygon',{ points:polyStr(chamferPts(w*0.52,hh*0.52,m*0.2)), className:'gem-table', style:fills.table, key:keyBase+'-t' }));
  return kids;
}

function pearPath(w,hh){
  return 'M 0,' + (-hh).toFixed(2) +
    ' C ' + (w*0.86).toFixed(2) + ',' + (-hh*0.55).toFixed(2) + ' ' + w.toFixed(2) + ',' + (-hh*0.05).toFixed(2) + ' ' + w.toFixed(2) + ',' + (hh*0.32).toFixed(2) +
    ' C ' + w.toFixed(2) + ',' + (hh*0.76).toFixed(2) + ' ' + (w*0.55).toFixed(2) + ',' + hh.toFixed(2) + ' 0,' + hh.toFixed(2) +
    ' C ' + (-w*0.55).toFixed(2) + ',' + hh.toFixed(2) + ' ' + (-w).toFixed(2) + ',' + (hh*0.76).toFixed(2) + ' ' + (-w).toFixed(2) + ',' + (hh*0.32).toFixed(2) +
    ' C ' + (-w).toFixed(2) + ',' + (-hh*0.05).toFixed(2) + ' ' + (-w*0.86).toFixed(2) + ',' + (-hh*0.55).toFixed(2) + ' 0,' + (-hh).toFixed(2) + ' Z';
}
function gemPear(w,hh,detailed,keyBase,uid){
  var fills = gemFills(uid);
  var kids = [h('path',{ d:pearPath(w,hh), className:'gem-outer', style:fills.outer, key:keyBase+'-o' })];
  if (detailed){
    kids.push(h('line',{ x1:0, y1:-hh, x2:0, y2:-hh*0.4, className:'gem-facet', key:keyBase+'-f1' }));
    kids.push(h('line',{ x1:w*0.9, y1:hh*0.2, x2:w*0.3, y2:hh*0.1, className:'gem-facet', key:keyBase+'-f2' }));
    kids.push(h('line',{ x1:-w*0.9, y1:hh*0.2, x2:-w*0.3, y2:hh*0.1, className:'gem-facet', key:keyBase+'-f3' }));
  }
  kids.push(h('path',{ d:pearPath(w*0.5,hh*0.5), className:'gem-table', style:fills.table, transform:'translate(0,'+(hh*0.16).toFixed(2)+')', key:keyBase+'-t' }));
  return kids;
}

function marquisePath(w,hh){
  return 'M 0,' + (-hh).toFixed(2) +
    ' C ' + (w*0.58).toFixed(2) + ',' + (-hh*0.56).toFixed(2) + ' ' + w.toFixed(2) + ',' + (-hh*0.22).toFixed(2) + ' ' + w.toFixed(2) + ',0' +
    ' C ' + w.toFixed(2) + ',' + (hh*0.22).toFixed(2) + ' ' + (w*0.58).toFixed(2) + ',' + (hh*0.56).toFixed(2) + ' 0,' + hh.toFixed(2) +
    ' C ' + (-w*0.58).toFixed(2) + ',' + (hh*0.56).toFixed(2) + ' ' + (-w).toFixed(2) + ',' + (hh*0.22).toFixed(2) + ' ' + (-w).toFixed(2) + ',0' +
    ' C ' + (-w).toFixed(2) + ',' + (-hh*0.22).toFixed(2) + ' ' + (-w*0.58).toFixed(2) + ',' + (-hh*0.56).toFixed(2) + ' 0,' + (-hh).toFixed(2) + ' Z';
}
function gemMarquise(w,hh,detailed,keyBase,uid){
  var fills = gemFills(uid);
  var kids = [h('path',{ d:marquisePath(w,hh), className:'gem-outer', style:fills.outer, key:keyBase+'-o' })];
  if (detailed){
    kids.push(h('line',{ x1:0, y1:-hh, x2:0, y2:-hh*0.32, className:'gem-facet', key:keyBase+'-f1' }));
    kids.push(h('line',{ x1:0, y1:hh, x2:0, y2:hh*0.32, className:'gem-facet', key:keyBase+'-f2' }));
    kids.push(h('line',{ x1:w, y1:0, x2:w*0.36, y2:0, className:'gem-facet', key:keyBase+'-f3' }));
    kids.push(h('line',{ x1:-w, y1:0, x2:-w*0.36, y2:0, className:'gem-facet', key:keyBase+'-f4' }));
  }
  kids.push(h('path',{ d:marquisePath(w*0.5,hh*0.5), className:'gem-table', style:fills.table, key:keyBase+'-t' }));
  return kids;
}

function buildGem(shape,w,hh,detailed,keyBase,uid){
  keyBase = keyBase || 'g';
  uid = uid || 'g';
  switch(shape){
    case 'round':    return gemRadial(w,hh,24,0.42,3,detailed,keyBase,uid);
    case 'oval':     return gemRadial(w,hh,22,0.46,2,detailed,keyBase,uid);
    case 'princess': return gemPrincess(w,hh,detailed,keyBase,uid);
    case 'cushion':  return gemCushion(w,hh,detailed,keyBase,uid);
    case 'emerald':  return gemEmerald(w,hh,detailed,keyBase,uid);
    case 'pear':     return gemPear(w,hh,detailed,keyBase,uid);
    case 'marquise': return gemMarquise(w,hh,detailed,keyBase,uid);
    default:         return gemRadial(w,hh,24,0.42,3,detailed,keyBase,uid);
  }
}

function prongMark(x,y,rot,fill,stroke,key){
  return h('path',{
    key:key,
    d:'M -2.6,3.6 L 0,-5.4 L 2.6,3.6 Q 0,6.1 -2.6,3.6 Z',
    transform:'translate('+x.toFixed(2)+','+y.toFixed(2)+') rotate('+rot+')',
    className:'prong',
    fill:fill, stroke:stroke
  });
}

function paveArc(cx,cy,rx,ry,startDeg,endDeg,n,keyPrefix){
  var circles = [];
  for (var i=0;i<n;i++){
    var t = (startDeg + ((endDeg-startDeg)*i)/(n-1)) * Math.PI/180;
    var px = cx + rx*Math.cos(t), py = cy + ry*Math.sin(t);
    var r = 3.0 - Math.abs(i-(n-1)/2) * 0.1;
    circles.push(h('circle',{ key:keyPrefix+i, cx:px, cy:py, r:r, className:'melee' }));
  }
  return h('g',{ key:keyPrefix }, circles);
}

function haloRing(cx,cy,rx,ry,keyPrefix){
  var n = 14, circles = [];
  for (var i=0;i<n;i++){
    var t = (Math.PI*2*i)/n;
    var px = cx + rx*Math.cos(t), py = cy + ry*Math.sin(t);
    circles.push(h('circle',{ key:keyPrefix+i, cx:px, cy:py, r:3.3, className:'melee' }));
  }
  return h('g',{ key:keyPrefix }, circles);
}

function curvedBandPath(cx,cy,rx,ry,strokeUrl,keyBase){
  var leftX = cx-rx, rightX = cx+rx, y = cy;
  var topY = cy - ry - 7;
  var d = 'M '+leftX+','+y+' A '+rx+','+ry+' 0 1 0 '+rightX+','+y+
    ' C '+(cx+rx*0.52)+','+topY+' '+(cx-rx*0.52)+','+topY+' '+leftX+','+y+' Z';
  return h('path',{ key:keyBase, d:d, fill:'none', stroke:strokeUrl, strokeWidth:13, strokeLinejoin:'round' });
}

function arcPoints(cx,cy,rx,ry,startDeg,endDeg,n){
  var pts = [];
  for (var i=0;i<n;i++){
    var t = (startDeg + ((endDeg-startDeg)*i)/(n-1)) * Math.PI/180;
    pts.push([cx+rx*Math.cos(t), cy+ry*Math.sin(t)]);
  }
  return pts;
}
function arcPolyStr(pts){ return pts.map(function(p){ return p[0].toFixed(1)+','+p[1].toFixed(1); }).join(' '); }

/* Band profile = cross-section shape, rendered as shading/highlight
   overlays on top of the base band stroke (comfort=soft rounded
   highlight, flat=hard edge line, knife-edge=bright centerline,
   milgrain=beaded edges). No price impact — see pricing.js comment. */
function bandProfileOverlay(cx,cy,rx,ry,strokeW,profile,metal,keyPrefix){
  if (profile==='flat'){
    var inset = strokeW*0.36;
    return [ h('ellipse',{ key:keyPrefix+'-edge', cx:cx, cy:cy, rx:rx-inset, ry:ry-inset, fill:'none', stroke:metal.light, strokeWidth:1.1, opacity:0.75 }) ];
  }
  if (profile==='knife-edge'){
    return [ h('ellipse',{ key:keyPrefix+'-ridge', cx:cx, cy:cy, rx:rx, ry:ry, fill:'none', stroke:metal.light, strokeWidth:1.3, opacity:0.9 }) ];
  }
  if (profile==='milgrain'){
    var kids = [];
    var outer = arcPoints(cx,cy,rx+strokeW*0.46,ry+strokeW*0.40,-176,-4,24);
    var inner = arcPoints(cx,cy,rx-strokeW*0.46,ry-strokeW*0.40,-176,-4,24);
    outer.forEach(function(p,i){ kids.push(h('circle',{ key:keyPrefix+'-bo'+i, cx:p[0], cy:p[1], r:0.85, fill:metal.dark })); });
    inner.forEach(function(p,i){ kids.push(h('circle',{ key:keyPrefix+'-bi'+i, cx:p[0], cy:p[1], r:0.85, fill:metal.dark })); });
    return kids;
  }
  /* comfort (default): soft rounded highlight down the center */
  return [ h('ellipse',{ key:keyPrefix+'-hl', cx:cx, cy:cy, rx:rx, ry:ry, fill:'none', stroke:metal.light, strokeWidth:Math.max(1.2,strokeW*0.34), opacity:0.5 }) ];
}

/* Band detail = surface texture/accent stones along the band's
   front-facing arc (skip the ~40° nearest the head, where prongs sit). */
function bandDetailOverlay(cx,cy,rx,ry,strokeW,detail,metal,keyPrefix){
  var startA = -172, endA = -8;
  if (detail==='pave'){
    return [ paveArc(cx,cy,rx,ry,startA,-100,6,keyPrefix+'-pv-l'), paveArc(cx,cy,rx,ry,-80,endA,6,keyPrefix+'-pv-r') ];
  }
  if (detail==='channel'){
    var kids = [];
    var railOuter = arcPoints(cx,cy,rx+strokeW*0.32,ry+strokeW*0.28,startA,endA,20);
    var railInner = arcPoints(cx,cy,rx-strokeW*0.32,ry-strokeW*0.28,startA,endA,20);
    kids.push(h('polyline',{ key:keyPrefix+'-ro', points:arcPolyStr(railOuter), fill:'none', stroke:metal.dark, strokeWidth:1 }));
    kids.push(h('polyline',{ key:keyPrefix+'-ri', points:arcPolyStr(railInner), fill:'none', stroke:metal.dark, strokeWidth:1 }));
    var gems = arcPoints(cx,cy,rx,ry,startA+8,endA-8,9);
    gems.forEach(function(p,i){ kids.push(h('rect',{ key:keyPrefix+'-cg'+i, x:p[0]-1.5, y:p[1]-1.5, width:3, height:3, className:'melee' })); });
    return kids;
  }
  if (detail==='twisted'){
    return arcPoints(cx,cy,rx,ry,startA,endA,20).map(function(p,i){
      var rot = (i%2===0) ? 34 : -34;
      return h('line',{ key:keyPrefix+'-tw'+i, x1:p[0]-strokeW*0.34, y1:p[1], x2:p[0]+strokeW*0.34, y2:p[1], stroke:metal.dark, strokeWidth:1, opacity:0.6, transform:'rotate('+rot+' '+p[0].toFixed(1)+' '+p[1].toFixed(1)+')' });
    });
  }
  if (detail==='hammered'){
    return arcPoints(cx,cy,rx,ry,startA,endA,18).map(function(p,i){
      var jitter = ((Math.sin(i*12.9898)*43758.5453) % 1 + 1) % 1;
      var rr = 1.0 + jitter*0.9;
      return h('ellipse',{ key:keyPrefix+'-hm'+i, cx:p[0]+(jitter-0.5)*2, cy:p[1]+(jitter-0.5)*1.4, rx:rr, ry:rr*0.68, fill:metal.dark, opacity:0.28 });
    });
  }
  return [];
}

function metalGradientDefs(uid){
  return METALS.map(function(m){
    return h('linearGradient',{ id:'metalGrad-'+m.id+'-'+uid, x1:'15%', y1:'0%', x2:'85%', y2:'100%', key:m.id },
      h('stop',{ offset:'0%', stopColor:m.light }),
      h('stop',{ offset:'52%', stopColor:m.mid }),
      h('stop',{ offset:'100%', stopColor:m.dark })
    );
  });
}

/* Radial "light entering the stone" gradients — brighter, off-center
   hotspot fading to a deeper edge tone, so facets read as catching
   and returning light rather than flat color fills. */
function gemGradientDefs(uid){
  return [
    h('radialGradient',{ id:'gemBrilliance-'+uid, cx:'36%', cy:'30%', r:'78%', key:'gb' },
      h('stop',{ offset:'0%', style:{ stopColor:'var(--gem-hi)' } }),
      h('stop',{ offset:'42%', style:{ stopColor:'var(--gem-fill)' } }),
      h('stop',{ offset:'100%', style:{ stopColor:'var(--gem-deep)' } })
    ),
    h('radialGradient',{ id:'gemTableShine-'+uid, cx:'34%', cy:'28%', r:'82%', key:'gt' },
      h('stop',{ offset:'0%', style:{ stopColor:'var(--gem-hi)' } }),
      h('stop',{ offset:'58%', style:{ stopColor:'var(--gem-table)' } }),
      h('stop',{ offset:'100%', style:{ stopColor:'var(--gem-fill)' } })
    )
  ];
}

function softShadowFilter(uid){
  return h('filter',{ id:'softShadow-'+uid, x:'-60%', y:'-60%', width:'220%', height:'220%', key:'sh' },
    h('feGaussianBlur',{ stdDeviation:3.2 })
  );
}

/* ============================================================
   RING SCENE
   ============================================================ */
function RingScene(props){
  var shape = props.shape, setting = props.setting, metalId = props.metalId,
      carat = props.carat, bandOn = props.bandOn, bandStyle = props.bandStyle, uid = props.uid;
  var ringBandProfile = props.ringBandProfile || 'comfort';
  var ringBandDetail = props.ringBandDetail || 'plain';
  var ringBandWidth = props.ringBandWidth || (BAND_WIDTH_CFG ? BAND_WIDTH_CFG.default : 2.2);
  var metal = findMetal(metalId) || METALS[0];
  var frame = gemFrame(shape, carat, bandOn);
  var gw = frame.gw, gh = frame.gh;
  var gemCx = frame.cx, gemCy = frame.cy;
  var bandCx = 150, bandCy = 178, bandRx = 88, bandRy = 70;
  var bandStrokeW = 6 + ringBandWidth*4.1;
  var strokeUrl = 'url(#metalGrad-'+metal.id+'-'+uid+')';

  var kids = [ h('defs',{ key:'defs' }, metalGradientDefs(uid), gemGradientDefs(uid), softShadowFilter(uid)) ];

  kids.push(h('ellipse',{ key:'bandShadow', cx:bandCx, cy:bandCy+bandRy*0.58, rx:bandRx*0.7, ry:bandRy*0.15, style:{ fill:'var(--ring-shadow)' }, filter:'url(#softShadow-'+uid+')' }));
  kids.push(h('ellipse',{ key:'band', cx:bandCx, cy:bandCy, rx:bandRx, ry:bandRy, fill:'none', stroke:strokeUrl, strokeWidth:bandStrokeW }));
  Array.prototype.push.apply(kids, bandProfileOverlay(bandCx,bandCy,bandRx,bandRy,bandStrokeW,ringBandProfile,metal,'e-profile'));
  Array.prototype.push.apply(kids, bandDetailOverlay(bandCx,bandCy,bandRx,bandRy,bandStrokeW,ringBandDetail,metal,'e-detail'));
  kids.push(h('polyline',{ key:'bandShine', points:arcPolyStr(arcPoints(bandCx,bandCy,bandRx,bandRy,-160,-104,10)), fill:'none', stroke:metal.light, strokeWidth:Math.max(1.2,bandStrokeW*0.13), strokeLinecap:'round', opacity:0.7 }));

  if (setting==='pave' && ringBandDetail!=='pave'){
    kids.push(paveArc(bandCx,bandCy,bandRx,bandRy,-172,-100,6,'e-pave-l'));
    kids.push(paveArc(bandCx,bandCy,bandRx,bandRy,-80,-8,6,'e-pave-r'));
  }
  if (setting==='halo'){
    kids.push(haloRing(gemCx,gemCy,gw+11,gh+11,'halo'));
  }
  if (setting==='three-stone'){
    var sw = gw*0.5, sh = gh*0.5, offX = gw+sw+9;
    [-1,1].forEach(function(dir){
      var cx = gemCx+dir*offX, cy = gemCy+11;
      kids.push(h('g',{ key:'side'+dir, transform:'translate('+cx+','+cy+')' },
        buildGem(shape, sw, sh, false, 'side'+dir, uid),
        prongMark(sw*0.72,-sh*0.72,45,metal.mid,metal.dark,'sp'+dir+'a'),
        prongMark(-sw*0.72,-sh*0.72,-45,metal.mid,metal.dark,'sp'+dir+'b')
      ));
    });
  }

  /* Center gem itself is rendered by the 3D viewer, overlaid on top
     of this SVG at the same spot (see gemFrame/RingStage) — only the
     prongs that appear to grip it stay here. */
  kids.push(h('g',{ key:'center', transform:'translate('+gemCx+','+gemCy+')' },
    prongMark(gw*0.7,-gh*0.7,45,metal.mid,metal.dark,'pa'),
    prongMark(gw*0.7,gh*0.7,135,metal.mid,metal.dark,'pb'),
    prongMark(-gw*0.7,gh*0.7,-135,metal.mid,metal.dark,'pc'),
    prongMark(-gw*0.7,-gh*0.7,-45,metal.mid,metal.dark,'pd')
  ));

  var viewH = frame.viewH;
  if (bandOn){
    var wCx = 150, wCy = 350, wRx = 90, wRy = 70;
    kids.push(h('ellipse',{ key:'wbandShadow', cx:wCx, cy:wCy+wRy*0.6, rx:wRx*0.7, ry:wRy*0.15, style:{ fill:'var(--ring-shadow)' }, filter:'url(#softShadow-'+uid+')' }));
    if (bandStyle==='curved'){
      kids.push(curvedBandPath(wCx,wCy,wRx,wRy,strokeUrl,'wband'));
    } else {
      kids.push(h('ellipse',{ key:'wband', cx:wCx, cy:wCy, rx:wRx, ry:wRy, fill:'none', stroke:strokeUrl, strokeWidth:13 }));
      kids.push(h('polyline',{ key:'wbandShine', points:arcPolyStr(arcPoints(wCx,wCy,wRx,wRy,-160,-104,10)), fill:'none', stroke:metal.light, strokeWidth:1.4, strokeLinecap:'round', opacity:0.65 }));
    }
    if (bandStyle==='pave'){
      kids.push(paveArc(wCx,wCy,wRx,wRy,-172,-8,10,'w-pave'));
    }
  }

  return h('svg',{ viewBox:'0 0 300 '+viewH, className:'ring-scene', role:'img', 'aria-label':'Ring preview: '+shapeLabel(shape)+' diamond, '+(setting||'')+' setting, '+metal.label }, kids);
}

/* ============================================================
   3D DIAMOND VIEWER

   Mounts a three.js scene (diamond3d.js, loaded as an ES module from
   shell_template.html) into a plain div and drives it from React
   props. The module isn't guaranteed loaded by the time this effect
   first runs, so it polls briefly rather than assuming readiness.
   ============================================================ */
function Diamond3DViewer(props){
  var containerRef = useRef(null);
  var optsRef = useRef(null);
  optsRef.current = { shape:props.shape, carat:props.carat, cut:props.cut, metalColors:props.metal };

  useEffect(function(){
    var el = containerRef.current;
    if (!el) return;
    var cancelled = false;
    function tryApply(){
      if (cancelled) return;
      if (window.GracieDiamond3D){
        window.GracieDiamond3D.update(el, optsRef.current);
      } else {
        setTimeout(tryApply, 60);
      }
    }
    tryApply();
    return function(){ cancelled = true; };
  }, [props.shape, props.carat, props.cut, props.metal && props.metal.mid]);

  useEffect(function(){
    var el = containerRef.current;
    return function(){
      if (el && window.GracieDiamond3D) window.GracieDiamond3D.unmount(el);
    };
  }, []);

  return h('div', { className:'diamond3d-mount', ref:containerRef, style:props.style });
}

/* Wraps the SVG ring (band/setting/prongs) and the 3D diamond canvas
   together, positioning the canvas over the spot RingScene leaves
   empty for the center stone (see gemFrame + the "center" group
   comment in RingScene above). */
function RingStage(props){
  var sel = props.sel, quote = props.quote, uid = props.uid, maxWidth = props.maxWidth;
  var diamond = quote.diamond;
  var carat = diamond ? diamond.carat : 1;
  var frame = gemFrame(sel.shape, carat, sel.bandOn);
  /* The 3D stone needs real screen space to show facets/fire — sizing
     the overlay tightly to the SVG gem's own (often tiny) footprint,
     like the prongs do, would shrink it to a blur. Pad generously and
     floor it, capped so it never swallows the band below. */
  var wPct = Math.max(34, (frame.gw*2.3*2 / frame.viewW) * 100);
  var hPct = Math.max(30, (frame.gh*2.3*2 / frame.viewH) * 100);
  wPct = Math.min(wPct, 62);
  hPct = Math.min(hPct, 46);
  var leftPct = ((frame.cx / frame.viewW) * 100) - wPct/2;
  var topPct = ((frame.cy / frame.viewH) * 100) - hPct/2;
  var metal = quote.metal || METALS[0];
  return h('div', null,
    h('div', { className:'ring-stage-frame', style:{ maxWidth:maxWidth, aspectRatio:frame.viewW+' / '+frame.viewH } },
      h(RingScene, { shape:sel.shape, setting:sel.setting, metalId:sel.metal, carat:carat, bandOn:sel.bandOn, bandStyle:sel.bandStyle, ringBandProfile:sel.ringBandProfile, ringBandDetail:sel.ringBandDetail, ringBandWidth:sel.ringBandWidth, uid:uid }),
      h(Diamond3DViewer, {
        key:'d3d-'+uid,
        shape:sel.shape, carat:carat, cut: diamond ? diamond.cut : 'Excellent',
        metal:{ light:metal.light, mid:metal.mid, dark:metal.dark },
        style:{ left:leftPct+'%', top:topPct+'%', width:wPct+'%', height:hPct+'%' }
      })
    ),
    h('p', { className:'diamond3d-caption' }, shapeDimsLabel(sel.shape, carat) + ' · drag the stone to rotate')
  );
}

function RingGlyph(props){
  var metal = findMetal(props.metalId) || METALS[0];
  var uid = props.uid;
  return h('svg',{ viewBox:'0 0 46 46', className:'tray-glyph', 'aria-hidden':'true' },
    h('defs',null, metalGradientDefs(uid), gemGradientDefs(uid)),
    h('ellipse',{ cx:23, cy:28, rx:15, ry:11.5, fill:'none', stroke:'url(#metalGrad-'+metal.id+'-'+uid+')', strokeWidth:4 }),
    h('path',{ d:'M23,10 L28.2,17.2 L23,24.6 L17.8,17.2 Z', className:'gem-outer', style:{ fill:'url(#gemBrilliance-'+uid+')' } })
  );
}

function MiniShapeIcon(props){
  var shape = props.shape;
  var uid = 'mini-'+shape;
  var box = GEM_BOX[shape] || GEM_BOX.round;
  var w = box.w*13.5, hh = box.h*13.5;
  return h('svg',{ viewBox:'0 0 44 44', className:'mini-icon', 'aria-hidden':'true' },
    h('defs',null, gemGradientDefs(uid)),
    h('g',{ transform:'translate(22,22)' }, buildGem(shape,w,hh,true,'mi',uid))
  );
}

function SettingGlyph(props){
  var id = props.id;
  var cx=22, cy=24, r=9;
  var kids = [ h('circle',{ key:'c', cx:cx, cy:cy, r:r, className:'gem-outer' }) ];
  if (id==='pave'){
    for (var i=0;i<5;i++){
      var t = (-160 + i*32) * Math.PI/180;
      kids.push(h('circle',{ key:'p'+i, cx:cx+16*Math.cos(t), cy:cy+9*Math.sin(t)+6, r:1.8, className:'melee' }));
    }
  }
  if (id==='halo'){
    var n=10;
    for (var j=0;j<n;j++){
      var tt = (Math.PI*2*j)/n;
      kids.push(h('circle',{ key:'h'+j, cx:cx+(r+5)*Math.cos(tt), cy:cy+(r+5)*Math.sin(tt), r:1.7, className:'melee' }));
    }
  }
  if (id==='three-stone'){
    kids.push(h('circle',{ key:'l', cx:cx-15, cy:cy+3, r:5, className:'gem-outer' }));
    kids.push(h('circle',{ key:'r', cx:cx+15, cy:cy+3, r:5, className:'gem-outer' }));
  }
  return h('svg',{ viewBox:'0 0 44 44', className:'mini-icon', 'aria-hidden':'true' }, kids);
}

function BandGlyph(props){
  var id = props.id;
  var cx=22, cy=24, rx=15, ry=10;
  var kids = [];
  if (id==='curved'){
    kids.push(h('path',{ key:'b', d:curvedGlyphPath(cx,cy,rx,ry), className:'gem-outer', fill:'none', strokeWidth:2.4 }));
  } else {
    kids.push(h('ellipse',{ key:'b', cx:cx, cy:cy, rx:rx, ry:ry, className:'gem-outer', fill:'none', strokeWidth:2.4 }));
  }
  if (id==='pave'){
    for (var i=0;i<7;i++){
      var t = (-165 + i*24) * Math.PI/180;
      kids.push(h('circle',{ key:'p'+i, cx:cx+rx*Math.cos(t), cy:cy+ry*Math.sin(t), r:1.6, className:'melee' }));
    }
  }
  return h('svg',{ viewBox:'0 0 44 44', className:'mini-icon', 'aria-hidden':'true' }, kids);
}
function curvedGlyphPath(cx,cy,rx,ry){
  var leftX=cx-rx, rightX=cx+rx, y=cy, peakY=cy-ry-4;
  return 'M '+leftX+','+y+' A '+rx+','+ry+' 0 1 1 '+rightX+','+y+' Q '+(cx+rx*0.4)+','+(cy-ry*1.3)+' '+cx+','+peakY+' Q '+(cx-rx*0.4)+','+(cy-ry*1.3)+' '+leftX+','+y+' Z';
}

function CheckIcon(){
  return h('svg',{ viewBox:'0 0 16 16', width:9, height:9, fill:'none', 'aria-hidden':'true' },
    h('path',{ d:'M3 8.4L6.2 11.4L13 4.4', stroke:'currentColor', strokeWidth:2, strokeLinecap:'round', strokeLinejoin:'round' })
  );
}
function ChevronIcon(extra){
  return h('svg',Object.assign({ viewBox:'0 0 20 20', width:16, height:16, fill:'none', 'aria-hidden':'true' }, extra||{}),
    h('path',{ d:'M5 7.5L10 12.5L15 7.5', stroke:'currentColor', strokeWidth:1.6, strokeLinecap:'round', strokeLinejoin:'round' })
  );
}
function BigCheckIcon(){
  return h('svg',{ viewBox:'0 0 44 44', className:'confirm-mark', 'aria-hidden':'true' },
    h('circle',{ cx:22, cy:22, r:20, fill:'none', stroke:'var(--accent)', strokeWidth:1.6 }),
    h('path',{ d:'M13 22.5L19 28.5L31 15.5', fill:'none', stroke:'var(--accent)', strokeWidth:2.2, strokeLinecap:'round', strokeLinejoin:'round' })
  );
}

/* ============================================================
   PRICING
   ============================================================ */
function computeQuote(sel){
  var diamond = sel.diamondId ? DIAMONDS.filter(function(d){return d.id===sel.diamondId;})[0] : null;
  var setting = findSetting(sel.setting);
  var metal = findMetal(sel.metal);
  var band = (sel.bandOn && sel.bandStyle) ? findBand(sel.bandStyle) : null;
  var mult = metal ? metal.multiplier : 1;
  var diamondPrice = diamond ? diamond.price : 0;
  var settingPrice = setting ? Math.round(setting.base*mult) : 0;
  var bandPrice = band ? Math.round(band.base*mult) : 0;

  /* Band Design — additive, same base*multiplier pattern as above. */
  var ringBandProfile = findBandProfile(sel.ringBandProfile);
  var ringBandDetail = findBandDetail(sel.ringBandDetail);
  var ringBandWidth = sel.ringBandWidth || BAND_WIDTH_CFG.default;
  var widthOverMin = Math.max(0, ringBandWidth - BAND_WIDTH_CFG.min);
  var bandWidthPrice = Math.round(widthOverMin * BAND_WIDTH_CFG.perMmRate * mult);
  var bandDetailPrice = ringBandDetail ? Math.round(ringBandDetail.upcharge*mult) : 0;
  var engravingPrice = (sel.engraving && sel.engraving.trim()) ? ENGRAVING_FEE : 0;

  return {
    diamond:diamond, setting:setting, metal:metal, band:band,
    diamondPrice:diamondPrice, settingPrice:settingPrice, bandPrice:bandPrice,
    ringBandProfile:ringBandProfile, ringBandDetail:ringBandDetail, ringBandWidth:ringBandWidth,
    bandWidthPrice:bandWidthPrice, bandDetailPrice:bandDetailPrice, engravingPrice:engravingPrice,
    total: diamondPrice+settingPrice+bandPrice+bandWidthPrice+bandDetailPrice+engravingPrice
  };
}

/* ============================================================
   PREVIEW TRAY
   ============================================================ */
function PreviewTray(props){
  var sel = props.sel, quote = props.quote, expanded = props.expanded, onToggle = props.onToggle;
  var diamond = quote.diamond;
  return h('div',{ className:'tray' + (expanded?' expanded':'') },
    h('button',{ type:'button', className:'tray-head', onClick:onToggle, 'aria-expanded':expanded },
      h(RingGlyph,{ metalId:sel.metal, uid:'head' }),
      h('div',{ className:'tray-head-text' },
        h('div',{ className:'tray-price-row' },
          h('span',{ className:'tray-price serif tnum' }, fmtMoney(quote.total)),
          h('span',{ className:'tray-price-label' }, 'estimate')
        ),
        h('div',{ className:'tray-sub' },
          shapeLabel(sel.shape) + (diamond ? ' · ' + diamond.carat.toFixed(2) + ' ct' : '') +
          (quote.setting ? ' · ' + quote.setting.label : '') + (sel.bandOn ? ' · + band' : '')
        )
      ),
      h('span',{ className:'tray-toggle' }, ChevronIcon())
    ),
    h('div',{ className:'tray-detail' },
      h('div',{ className:'tray-stage' }, h(RingStage,{ sel:sel, quote:quote, uid:'tray', maxWidth:300 })),
      h('div',{ className:'chip-row' },
        h('span',{ className:'chip' }, shapeLabel(sel.shape)),
        quote.setting && h('span',{ className:'chip' }, quote.setting.label),
        quote.metal && h('span',{ className:'chip' }, quote.metal.label),
        sel.bandOn && quote.band && h('span',{ className:'chip' }, quote.band.label + ' band')
      ),
      h('div',{ className:'tray-breakdown' },
        h('div',{ className:'tray-line' },
          h('span',{ className:'k' }, 'Diamond', diamond ? h('span',{ className:'muted' }, diamond.carat.toFixed(2)+' ct · '+diamond.cut) : h('span',{ className:'muted' }, 'Not yet selected')),
          h('span',{ className:'v tnum' }, diamond ? fmtMoney(quote.diamondPrice) : '—')
        ),
        h('div',{ className:'tray-line' },
          h('span',{ className:'k' }, 'Setting', quote.setting && h('span',{ className:'muted' }, quote.setting.label)),
          h('span',{ className:'v tnum' }, quote.setting ? fmtMoney(quote.settingPrice) : '—')
        ),
        sel.bandOn && h('div',{ className:'tray-line' },
          h('span',{ className:'k' }, 'Wedding band', quote.band && h('span',{ className:'muted' }, quote.band.label)),
          h('span',{ className:'v tnum' }, quote.band ? fmtMoney(quote.bandPrice) : '—')
        ),
        quote.bandWidthPrice>0 && h('div',{ className:'tray-line' },
          h('span',{ className:'k' }, 'Band width', h('span',{ className:'muted' }, quote.ringBandWidth.toFixed(1)+'mm')),
          h('span',{ className:'v tnum' }, fmtMoney(quote.bandWidthPrice))
        ),
        quote.bandDetailPrice>0 && h('div',{ className:'tray-line' },
          h('span',{ className:'k' }, 'Band detail', quote.ringBandDetail && h('span',{ className:'muted' }, quote.ringBandDetail.label)),
          h('span',{ className:'v tnum' }, fmtMoney(quote.bandDetailPrice))
        ),
        quote.engravingPrice>0 && h('div',{ className:'tray-line' },
          h('span',{ className:'k' }, 'Engraving'),
          h('span',{ className:'v tnum' }, fmtMoney(quote.engravingPrice))
        ),
        h('div',{ className:'tray-total' },
          h('span',{ className:'k' }, 'Estimated total'),
          h('span',{ className:'v tnum' }, fmtMoney(quote.total))
        )
      )
    )
  );
}

/* ============================================================
   STEP 1 — THE STONE
   ============================================================ */
function StoneStep(props){
  var sel = props.sel, setSel = props.setSel, filters = props.filters, setFilters = props.setFilters;

  var list = useMemo(function(){
    return DIAMONDS.filter(function(d){
      return d.shape===sel.shape && d.carat>=filters.caratMin && d.carat<=filters.caratMax && d.price<=filters.priceMax;
    }).sort(function(a,b){ return a.carat-b.carat; });
  }, [sel.shape, filters.caratMin, filters.caratMax, filters.priceMax]);

  function chooseShape(id){
    var next = { shape:id };
    var stillValid = sel.diamondId && DIAMONDS.filter(function(d){return d.id===sel.diamondId;})[0];
    if (!stillValid || stillValid.shape!==id){
      var firstMatch = DIAMONDS.filter(function(d){
        return d.shape===id && d.carat>=filters.caratMin && d.carat<=filters.caratMax && d.price<=filters.priceMax;
      })[0] || DIAMONDS.filter(function(d){ return d.shape===id; })[0];
      next.diamondId = firstMatch ? firstMatch.id : null;
    }
    setSel(next);
  }

  return h('div',null,
    h('span',{ className:'field-label' }, 'Choose a shape'),
    h('div',{ className:'swatch-grid' },
      SHAPES.map(function(s){
        var isSel = sel.shape===s.id;
        return h('button',{ type:'button', key:s.id, className:'swatch'+(isSel?' selected':''), onClick:function(){ chooseShape(s.id); }, 'aria-pressed':isSel },
          h('span',{ className:'swatch-check' }, CheckIcon()),
          h(MiniShapeIcon,{ shape:s.id }),
          h('span',{ className:'swatch-label' }, s.label)
        );
      })
    ),
    h('div',{ className:'filters', style:{ marginTop:22 } },
      h('div',{ className:'filter-row' },
        h('span',{ className:'field-label' }, h('span',null,'Carat range'), h('span',{ className:'val' }, filters.caratMin.toFixed(2)+' – '+filters.caratMax.toFixed(2)+' ct')),
        h('div',{ className:'range-dual' },
          h('span',null,'Min'),
          h('input',{ type:'range', min:CARAT_MIN, max:CARAT_MAX, step:0.05, value:filters.caratMin,
            onChange:function(e){ var v=parseFloat(e.target.value); setFilters({ caratMin:Math.min(v, filters.caratMax-0.05) }); },
            'aria-label':'Minimum carat' })
        ),
        h('div',{ className:'range-dual' },
          h('span',null,'Max'),
          h('input',{ type:'range', min:CARAT_MIN, max:CARAT_MAX, step:0.05, value:filters.caratMax,
            onChange:function(e){ var v=parseFloat(e.target.value); setFilters({ caratMax:Math.max(v, filters.caratMin+0.05) }); },
            'aria-label':'Maximum carat' })
        )
      ),
      h('div',{ className:'filter-row' },
        h('span',{ className:'field-label' }, h('span',null,'Price, up to'), h('span',{ className:'val' }, fmtMoney(filters.priceMax))),
        h('input',{ type:'range', min:1000, max:PRICE_CEIL, step:1000, value:filters.priceMax,
          onChange:function(e){ setFilters({ priceMax:parseInt(e.target.value,10) }); },
          'aria-label':'Maximum price' })
      )
    ),
    h('p',{ className:'diamond-count' }, list.length + (list.length===1 ? ' diamond matches your filters' : ' diamonds match your filters')),
    list.length===0
      ? h('div',{ className:'empty-note' }, 'No diamonds in this shape match your filters. Try widening the carat or price range.')
      : h('div',{ className:'diamond-grid' },
          list.map(function(d){
            var isSel = sel.diamondId===d.id;
            return h('button',{ type:'button', key:d.id, className:'diamond-card'+(isSel?' selected':''), onClick:function(){ setSel({ diamondId:d.id }); }, 'aria-pressed':isSel },
              h('div',{ className:'diamond-card-top' },
                h('span',{ className:'diamond-carat serif tnum' }, d.carat.toFixed(2)+' ct'),
                h('span',{ className:'diamond-price serif tnum' }, fmtMoney(d.price))
              ),
              h('div',{ className:'diamond-specs' },
                h('span',null, h('b',null,d.cut)), h('span',null,'·'),
                h('span',null,'Clarity ', h('b',null,d.clarity)), h('span',null,'·'),
                h('span',null,'Color ', h('b',null,d.color))
              )
            );
          })
        )
  );
}

/* ============================================================
   STEP 2 — THE SETTING
   ============================================================ */
function SettingStep(props){
  var sel = props.sel, setSel = props.setSel, quote = props.quote;
  var mult = quote.metal ? quote.metal.multiplier : 1;
  return h('div',null,
    h('span',{ className:'field-label' }, 'Choose a setting'),
    h('div',{ className:'option-list' },
      SETTINGS.map(function(s){
        var isSel = sel.setting===s.id;
        return h('button',{ type:'button', key:s.id, className:'option-card'+(isSel?' selected':''), onClick:function(){ setSel({ setting:s.id }); }, 'aria-pressed':isSel },
          h('span',{ className:'option-glyph' }, h(SettingGlyph,{ id:s.id })),
          h('span',{ className:'option-body' },
            h('span',{ className:'option-name' }, s.label),
            h('span',{ className:'option-desc' }, s.desc),
            h('span',{ className:'option-price tnum' }, fmtMoney(Math.round(s.base*mult)))
          ),
          h('span',{ className:'option-radio' })
        );
      })
    )
  );
}

/* ============================================================
   STEP 3 — THE METAL
   ============================================================ */
function MetalStep(props){
  var sel = props.sel, setSel = props.setSel, quote = props.quote;
  var setting = quote.setting, band = (sel.bandOn && sel.bandStyle) ? findBand(sel.bandStyle) : null;
  var baseSum = (setting?setting.base:0) + (band?band.base:0);
  return h('div',null,
    h('span',{ className:'field-label' }, 'Choose a metal'),
    h('div',{ className:'metal-grid' },
      METALS.map(function(m){
        var isSel = sel.metal===m.id;
        var delta = Math.round((m.multiplier-1)*baseSum);
        return h('button',{ type:'button', key:m.id, className:'metal-swatch'+(isSel?' selected':''), onClick:function(){ setSel({ metal:m.id }); }, 'aria-pressed':isSel },
          h('span',{ className:'metal-dot', style:{ backgroundImage:'linear-gradient(135deg,'+m.light+','+m.mid+' 55%,'+m.dark+')' } }),
          h('span',{ className:'metal-name' }, m.label),
          h('span',{ className:'metal-delta tnum' }, delta>0 ? '+'+fmtMoney(delta) : 'Included')
        );
      })
    ),
    h('p',{ className:'helptext' }, 'Platinum is denser and pricier than 18k gold; your wedding band, if added, will match this metal.')
  );
}

/* ============================================================
   STEP 4 — THE BAND
   ============================================================ */
function BandStep(props){
  var sel = props.sel, setSel = props.setSel, quote = props.quote;
  var mult = quote.metal ? quote.metal.multiplier : 1;
  return h('div',null,
    h('div',{ className:'band-toggle' },
      h('span',{ className:'band-toggle-text' },
        h('span',{ className:'option-name serif' }, 'Add a matching wedding band'),
        h('div',{ className:'option-desc' }, 'Worn stacked with your engagement ring, in the same metal.')
      ),
      h('button',{ type:'button', className:'switch'+(sel.bandOn?' on':''), onClick:function(){ setSel({ bandOn:!sel.bandOn, bandStyle: (!sel.bandOn && !sel.bandStyle) ? 'plain' : sel.bandStyle }); }, role:'switch', 'aria-checked':sel.bandOn, 'aria-label':'Add a matching wedding band' })
    ),
    sel.bandOn && h('div',{ className:'option-list' },
      BAND_STYLES.map(function(b){
        var isSel = sel.bandStyle===b.id;
        return h('button',{ type:'button', key:b.id, className:'option-card'+(isSel?' selected':''), onClick:function(){ setSel({ bandStyle:b.id }); }, 'aria-pressed':isSel },
          h('span',{ className:'option-glyph' }, h(BandGlyph,{ id:b.id })),
          h('span',{ className:'option-body' },
            h('span',{ className:'option-name' }, b.label),
            h('span',{ className:'option-desc' }, b.desc),
            h('span',{ className:'option-price tnum' }, fmtMoney(Math.round(b.base*mult)))
          ),
          h('span',{ className:'option-radio' })
        );
      })
    )
  );
}

/* ============================================================
   STEP 5 — BAND DESIGN
   (the engagement ring's own band: profile / width / detail /
   engraving — distinct from the wedding-band add-on above)
   ============================================================ */
function ProfileGlyph(props){
  var id = props.id;
  var y=22, x0=8, x1=36, hh=8;
  var kids = [ h('rect',{ key:'bar', x:x0, y:y-hh, width:x1-x0, height:hh*2,
    rx: id==='comfort'?hh:(id==='milgrain'?3:2), ry: id==='comfort'?hh:(id==='milgrain'?3:2),
    fill:'var(--card-sunk)', stroke:'var(--ink-soft)', strokeWidth:1.2 }) ];
  if (id==='flat'){
    kids.push(h('line',{ key:'ed', x1:x0+2, y1:y-hh+1.6, x2:x1-2, y2:y-hh+1.6, stroke:'var(--card)', strokeWidth:1.4 }));
  } else if (id==='knife-edge'){
    kids.push(h('line',{ key:'rg', x1:x0+2, y1:y, x2:x1-2, y2:y, stroke:'var(--card)', strokeWidth:1.7 }));
  } else if (id==='milgrain'){
    for (var i=0;i<7;i++){
      var xx = x0+3+((x1-x0-6)*i)/6;
      kids.push(h('circle',{ key:'to'+i, cx:xx, cy:y-hh, r:1, fill:'var(--ink-soft)' }));
      kids.push(h('circle',{ key:'bo'+i, cx:xx, cy:y+hh, r:1, fill:'var(--ink-soft)' }));
    }
  } else {
    kids.push(h('line',{ key:'hl', x1:x0+3, y1:y, x2:x1-3, y2:y, stroke:'var(--card)', strokeWidth:3, opacity:0.8 }));
  }
  return h('svg',{ viewBox:'0 0 44 44', className:'mini-icon', 'aria-hidden':'true' }, kids);
}

function DetailGlyph(props){
  var id = props.id;
  var y=22, x0=6, x1=38, hh=7;
  var kids = [ h('rect',{ key:'bar', x:x0, y:y-hh, width:x1-x0, height:hh*2, rx:hh*0.5, ry:hh*0.5, fill:'var(--card-sunk)', stroke:'var(--ink-soft)', strokeWidth:1.1 }) ];
  if (id==='pave'){
    for (var i=0;i<6;i++){ var xx=x0+4+((x1-x0-8)*i)/5; kids.push(h('circle',{ key:'p'+i, cx:xx, cy:y, r:1.6, className:'melee' })); }
  } else if (id==='channel'){
    kids.push(h('line',{ key:'r1', x1:x0+2, y1:y-hh+1.6, x2:x1-2, y2:y-hh+1.6, stroke:'var(--ink-soft)', strokeWidth:0.8 }));
    kids.push(h('line',{ key:'r2', x1:x0+2, y1:y+hh-1.6, x2:x1-2, y2:y+hh-1.6, stroke:'var(--ink-soft)', strokeWidth:0.8 }));
    for (var j=0;j<5;j++){ var xx2=x0+5+((x1-x0-10)*j)/4; kids.push(h('rect',{ key:'g'+j, x:xx2-1.3, y:y-1.3, width:2.6, height:2.6, className:'melee' })); }
  } else if (id==='twisted'){
    for (var k=0;k<6;k++){
      var xx3 = x0+4+((x1-x0-8)*k)/5;
      var rot = (k%2===0) ? 30 : -30;
      kids.push(h('line',{ key:'t'+k, x1:xx3-hh*0.7, y1:y, x2:xx3+hh*0.7, y2:y, stroke:'var(--ink-soft)', strokeWidth:1, transform:'rotate('+rot+' '+xx3+' '+y+')' }));
    }
  } else if (id==='hammered'){
    for (var m=0;m<7;m++){
      var xx4 = x0+4+((x1-x0-8)*m)/6;
      var yy = (m%2===0) ? y-2 : y+2;
      kids.push(h('circle',{ key:'h'+m, cx:xx4, cy:yy, r:1.1, fill:'var(--ink-soft)', opacity:0.5 }));
    }
  }
  return h('svg',{ viewBox:'0 0 44 44', className:'mini-icon', 'aria-hidden':'true' }, kids);
}

function BandDesignStep(props){
  var sel = props.sel, setSel = props.setSel, quote = props.quote;
  var mult = quote.metal ? quote.metal.multiplier : 1;
  var width = sel.ringBandWidth || BAND_WIDTH_CFG.default;
  var engraving = sel.engraving || '';
  return h('div',null,
    h('span',{ className:'field-label' }, 'Band profile'),
    h('div',{ className:'option-list' },
      BAND_PROFILES.map(function(p){
        var isSel = sel.ringBandProfile===p.id;
        return h('button',{ type:'button', key:p.id, className:'option-card'+(isSel?' selected':''), onClick:function(){ setSel({ ringBandProfile:p.id }); }, 'aria-pressed':isSel },
          h('span',{ className:'option-glyph' }, h(ProfileGlyph,{ id:p.id })),
          h('span',{ className:'option-body' },
            h('span',{ className:'option-name' }, p.label),
            h('span',{ className:'option-desc' }, p.desc)
          ),
          h('span',{ className:'option-radio' })
        );
      })
    ),
    h('div',{ className:'filters', style:{ marginTop:22, gridTemplateColumns:'1fr' } },
      h('div',{ className:'filter-row' },
        h('span',{ className:'field-label' }, h('span',null,'Band width'), h('span',{ className:'val' }, width.toFixed(1)+'mm')),
        h('input',{ type:'range', min:BAND_WIDTH_CFG.min, max:BAND_WIDTH_CFG.max, step:BAND_WIDTH_CFG.step, value:width,
          onChange:function(e){ setSel({ ringBandWidth:parseFloat(e.target.value) }); },
          'aria-label':'Band width in millimeters' })
      )
    ),
    h('span',{ className:'field-label', style:{ marginTop:22, display:'block' } }, 'Band detail'),
    h('div',{ className:'option-list' },
      BAND_DETAILS.map(function(d){
        var isSel = sel.ringBandDetail===d.id;
        var price = Math.round(d.upcharge*mult);
        return h('button',{ type:'button', key:d.id, className:'option-card'+(isSel?' selected':''), onClick:function(){ setSel({ ringBandDetail:d.id }); }, 'aria-pressed':isSel },
          h('span',{ className:'option-glyph' }, h(DetailGlyph,{ id:d.id })),
          h('span',{ className:'option-body' },
            h('span',{ className:'option-name' }, d.label),
            h('span',{ className:'option-desc' }, d.desc),
            h('span',{ className:'option-price tnum' }, price>0 ? fmtMoney(price) : 'Included')
          ),
          h('span',{ className:'option-radio' })
        );
      })
    ),
    h('div',{ className:'field', style:{ marginTop:22, maxWidth:340 } },
      h('label',{ htmlFor:'bd-engrave' }, 'Engraving (optional)'),
      h('input',{ id:'bd-engrave', type:'text', maxLength:20, value:engraving,
        onChange:function(e){ setSel({ engraving:e.target.value.slice(0,20) }); },
        placeholder:'e.g. Always' }),
      h('p',{ className:'helptext' }, engraving.length+'/20 characters · engraved inside the band, so it appears in your specification rather than the live preview.')
    )
  );
}

/* ============================================================
   STEP WRAPPER / RAIL
   ============================================================ */
var STEP_META = [
  { id:'stone',       title:'The Stone',   eyebrow:'Step 1' },
  { id:'setting',     title:'The Setting', eyebrow:'Step 2' },
  { id:'metal',       title:'The Metal',   eyebrow:'Step 3' },
  { id:'band',        title:'The Band',    eyebrow:'Step 4' },
  { id:'band-design', title:'Band Design', eyebrow:'Step 5' }
];

function stepSummary(i, sel, quote){
  if (i===0) return quote.diamond ? (shapeLabel(sel.shape)+' · '+quote.diamond.carat.toFixed(2)+' ct · '+fmtMoney(quote.diamond.price)) : 'Choose a diamond';
  if (i===1) return quote.setting ? quote.setting.label : 'Not yet chosen';
  if (i===2) return quote.metal ? quote.metal.label : 'Not yet chosen';
  if (i===3) return sel.bandOn && quote.band ? quote.band.label+' — added' : 'No wedding band';
  if (i===4) return (quote.ringBandProfile?quote.ringBandProfile.label:'')+' · '+quote.ringBandWidth.toFixed(1)+'mm · '+(quote.ringBandDetail?quote.ringBandDetail.label:'');
  return '';
}
function stepDone(i, sel){
  if (i===0) return !!sel.diamondId;
  if (i===1) return !!sel.setting;
  if (i===2) return !!sel.metal;
  if (i===3) return true;
  if (i===4) return !!sel.ringBandProfile;
  return false;
}

function Step(props){
  var index = props.index, active = props.active, onOpen = props.onOpen, onNext = props.onNext, onBack = props.onBack,
      sel = props.sel, quote = props.quote, isLast = props.isLast, children = props.children;
  var meta = STEP_META[index];
  return h('div',{ className:'step'+(active?' active':'')+(stepDone(index,sel)?' done':'') },
    h('button',{ type:'button', className:'step-head', onClick:function(){ onOpen(index); }, 'aria-expanded':active },
      h('span',{ className:'step-num serif' }, stepDone(index,sel) && !active ? CheckIcon() : (index+1)),
      h('span',{ className:'step-head-text' },
        h('span',{ className:'step-title' }, meta.title),
        h('span',{ className:'step-summary' }, stepSummary(index, sel, quote))
      ),
      h('span',{ className:'step-chevron' }, ChevronIcon())
    ),
    active && h('div',{ className:'step-body' },
      children,
      h('div',{ className:'step-actions' },
        index>0 && h('button',{ type:'button', className:'btn btn-ghost', onClick:onBack }, 'Back'),
        h('button',{ type:'button', className:'btn btn-primary', onClick:onNext, disabled: index===0 && !sel.diamondId },
          isLast ? 'See your ring' : 'Continue')
      )
    )
  );
}

/* ============================================================
   SUMMARY
   ============================================================ */
function SpecCard(props){
  var sel = props.sel, quote = props.quote;
  var d = quote.diamond;
  return h('div',{ className:'spec-card' },
    h('div',{ className:'spec-hero' }, h(RingStage,{ sel:sel, quote:quote, uid:'spec', maxWidth:260 })),
    h('div',{ className:'spec-heading' },
      h('span',{ className:'eyebrow' }, 'The Specification'),
      h('h2',{ className:'serif' }, shapeLabel(sel.shape)+' '+(quote.setting?quote.setting.label:'')),
      h('p',null, 'Prepared for your review — no payment required.')
    ),
    h('div',{ className:'spec-table' },
      h('div',{ className:'spec-row' }, h('span',{ className:'k' }, 'Diamond'), h('span',{ className:'v' }, d ? (d.carat.toFixed(2)+' ct '+shapeLabel(sel.shape)+', '+d.cut) : '—')),
      d && h('div',{ className:'spec-row' }, h('span',{ className:'k' }, 'Clarity / Color'), h('span',{ className:'v' }, d.clarity+' / '+d.color)),
      h('div',{ className:'spec-row' }, h('span',{ className:'k' }, 'Setting'), h('span',{ className:'v' }, quote.setting ? quote.setting.label : '—')),
      h('div',{ className:'spec-row' }, h('span',{ className:'k' }, 'Metal'), h('span',{ className:'v' }, quote.metal ? quote.metal.label : '—')),
      h('div',{ className:'spec-row' }, h('span',{ className:'k' }, 'Wedding band'), h('span',{ className:'v' }, (sel.bandOn && quote.band) ? quote.band.label : 'Not included')),
      h('div',{ className:'spec-row' }, h('span',{ className:'k' }, 'Band profile'), h('span',{ className:'v' }, quote.ringBandProfile ? quote.ringBandProfile.label : '—')),
      h('div',{ className:'spec-row' }, h('span',{ className:'k' }, 'Band width'), h('span',{ className:'v tnum' }, quote.ringBandWidth.toFixed(1)+'mm')),
      h('div',{ className:'spec-row' }, h('span',{ className:'k' }, 'Band detail'), h('span',{ className:'v' }, quote.ringBandDetail ? quote.ringBandDetail.label : '—')),
      sel.engraving && sel.engraving.trim() && h('div',{ className:'spec-row' }, h('span',{ className:'k' }, 'Engraving'), h('span',{ className:'v' }, '“'+sel.engraving.trim()+'”')),
      h('div',{ className:'spec-row' }, h('span',{ className:'k' }, 'Diamond price'), h('span',{ className:'v tnum' }, fmtMoney(quote.diamondPrice))),
      h('div',{ className:'spec-row' }, h('span',{ className:'k' }, 'Setting price'), h('span',{ className:'v tnum' }, fmtMoney(quote.settingPrice))),
      sel.bandOn && h('div',{ className:'spec-row' }, h('span',{ className:'k' }, 'Band price'), h('span',{ className:'v tnum' }, fmtMoney(quote.bandPrice))),
      quote.bandWidthPrice>0 && h('div',{ className:'spec-row' }, h('span',{ className:'k' }, 'Band width price'), h('span',{ className:'v tnum' }, fmtMoney(quote.bandWidthPrice))),
      quote.bandDetailPrice>0 && h('div',{ className:'spec-row' }, h('span',{ className:'k' }, 'Band detail price'), h('span',{ className:'v tnum' }, fmtMoney(quote.bandDetailPrice))),
      quote.engravingPrice>0 && h('div',{ className:'spec-row' }, h('span',{ className:'k' }, 'Engraving fee'), h('span',{ className:'v tnum' }, fmtMoney(quote.engravingPrice)))
    ),
    h('div',{ className:'spec-total-row' },
      h('span',{ className:'k serif' }, 'Estimated total'),
      h('span',{ className:'v serif tnum' }, fmtMoney(quote.total))
    )
  );
}

function QuoteForm(props){
  var onRestart = props.onRestart;
  var s = useState({ name:'', email:'', phone:'', contact:'email', notes:'' });
  var form = s[0], setForm = s[1];
  var es = useState({});
  var errors = es[0], setErrors = es[1];
  var ss = useState(false);
  var submitted = ss[0], setSubmitted = ss[1];

  function update(key,val){ var next={}; next[key]=val; setForm(Object.assign({},form,next)); }

  function submit(e){
    e.preventDefault();
    var errs = {};
    if (!form.name.trim()) errs.name = 'Please share your name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errs.email = 'Enter a valid email address.';
    setErrors(errs);
    if (Object.keys(errs).length===0) setSubmitted(true);
  }

  if (submitted){
    return h('div',{ className:'quote-card' },
      h('div',{ className:'confirm-panel' },
        BigCheckIcon(),
        h('h2',{ className:'serif' }, 'Request received'),
        h('p',null, 'Thank you, '+form.name.split(' ')[0]+'. Our atelier will follow up at '+form.email+' within one business day to discuss your specification.'),
        h('button',{ type:'button', className:'btn btn-ghost', style:{ marginTop:20 }, onClick:onRestart }, 'Design another ring')
      )
    );
  }

  return h('form',{ className:'quote-card', onSubmit:submit, noValidate:true },
    h('h2',{ className:'serif' }, 'Request a quote'),
    h('p',null, 'Share a few details and we’ll follow up with pricing, availability, and next steps.'),
    h('div',{ className:'form-grid' },
      h('div',{ className:'field' },
        h('label',{ htmlFor:'qf-name' }, 'Full name'),
        h('input',{ id:'qf-name', type:'text', value:form.name, onChange:function(e){ update('name', e.target.value); }, 'aria-invalid':!!errors.name }),
        errors.name && h('span',{ className:'field-error' }, errors.name)
      ),
      h('div',{ className:'field' },
        h('label',{ htmlFor:'qf-email' }, 'Email'),
        h('input',{ id:'qf-email', type:'email', value:form.email, onChange:function(e){ update('email', e.target.value); }, 'aria-invalid':!!errors.email }),
        errors.email && h('span',{ className:'field-error' }, errors.email)
      ),
      h('div',{ className:'field' },
        h('label',{ htmlFor:'qf-phone' }, 'Phone (optional)'),
        h('input',{ id:'qf-phone', type:'tel', value:form.phone, onChange:function(e){ update('phone', e.target.value); } })
      ),
      h('div',{ className:'field' },
        h('span',null, 'Preferred contact'),
        h('div',{ className:'radio-row' },
          h('label',{ className:'radio-opt' }, h('input',{ type:'radio', name:'contact', checked:form.contact==='email', onChange:function(){ update('contact','email'); } }), 'Email'),
          h('label',{ className:'radio-opt' }, h('input',{ type:'radio', name:'contact', checked:form.contact==='phone', onChange:function(){ update('contact','phone'); } }), 'Phone')
        )
      ),
      h('div',{ className:'field full' },
        h('label',{ htmlFor:'qf-notes' }, 'Notes (optional)'),
        h('textarea',{ id:'qf-notes', rows:3, value:form.notes, onChange:function(e){ update('notes', e.target.value); } })
      )
    ),
    h('div',{ className:'step-actions' },
      h('button',{ type:'submit', className:'btn btn-primary' }, 'Request a quote')
    )
  );
}

/* ============================================================
   APP
   ============================================================ */
function defaultSel(){
  var firstRound = DIAMONDS.filter(function(d){ return d.shape==='round'; })[0];
  return {
    shape:'round', diamondId:firstRound.id, setting:'solitaire', metal:'platinum', bandOn:false, bandStyle:null,
    ringBandProfile:'comfort', ringBandWidth:BAND_WIDTH_CFG.default, ringBandDetail:'plain', engraving:''
  };
}

function App(){
  var stS = useState(0); var step = stS[0], setStep = stS[1];
  var selS = useState(defaultSel()); var sel = selS[0], setSelRaw = selS[1];
  var filS = useState({ caratMin:CARAT_MIN, caratMax:CARAT_MAX, priceMax:PRICE_CEIL }); var filters = filS[0], setFiltersRaw = filS[1];
  var trS = useState(false); var trayExpanded = trS[0], setTrayExpanded = trS[1];

  function setSel(patch){ setSelRaw(function(prev){ return Object.assign({}, prev, patch); }); }
  function setFilters(patch){ setFiltersRaw(function(prev){ return Object.assign({}, prev, patch); }); }

  var quote = useMemo(function(){ return computeQuote(sel); }, [sel]);

  function goTo(i){ setStep(i); }
  function next(){ setStep(Math.min(STEP_META.length, step+1)); }
  function back(){ setStep(Math.max(0, step-1)); }
  function restart(){ setSel(defaultSel()); setStep(0); }

  var stepProps = [
    h(StoneStep,{ key:'s0', sel:sel, setSel:setSel, filters:filters, setFilters:setFilters }),
    h(SettingStep,{ key:'s1', sel:sel, setSel:setSel, quote:quote }),
    h(MetalStep,{ key:'s2', sel:sel, setSel:setSel, quote:quote }),
    h(BandStep,{ key:'s3', sel:sel, setSel:setSel, quote:quote }),
    h(BandDesignStep,{ key:'s4', sel:sel, setSel:setSel, quote:quote })
  ];

  var header = h('header',{ className:'masthead' },
    h('div',{ className:'wordmark' }, 'The ', h('em',null,'Grace'), ' Collection'),
    h('div',{ className:'tagline' }, 'Design your engagement ring, stone by stone.')
  );

  if (step===STEP_META.length){
    return h('div',{ className:'shell' },
      header,
      h('div',{ className:'summary-wrap' },
        h(SpecCard,{ sel:sel, quote:quote }),
        h(QuoteForm,{ onRestart:restart }),
        h('div',{ className:'step-actions', style:{ justifyContent:'center' } },
          h('button',{ type:'button', className:'btn btn-ghost', onClick:function(){ setStep(STEP_META.length-1); } }, 'Back to editing')
        ),
        h('p',{ className:'footer-note' }, 'A design prototype — mock diamond inventory, no payment collected.')
      )
    );
  }

  return h('div',{ className:'shell' },
    header,
    h('div',{ className:'layout' },
      h('div',{ className:'tray-col' },
        h(PreviewTray,{ sel:sel, quote:quote, expanded:trayExpanded, onToggle:function(){ setTrayExpanded(!trayExpanded); } })
      ),
      h('div',{ className:'wizard-col' },
        h('div',{ className:'steps' },
          STEP_META.map(function(m,i){
            return h(Step,{ key:m.id, index:i, active:step===i, onOpen:goTo, onNext:next, onBack:back, sel:sel, quote:quote, isLast:i===STEP_META.length-1 }, stepProps[i]);
          })
        )
      )
    )
  );
}

var root = ReactDOM.createRoot(document.getElementById('root'));
root.render(h(App));

})();
