/* ==============================================================
   The Grace Collection — 3D diamond viewer (three.js)

   Loaded as an ES module (see shell_template.html importmap for the
   "three" / "three/addons/" CDN mapping). Exposes window.GracieDiamond3D
   = { mount(container, opts), update(container, opts), unmount(container) }
   so the plain-script React app (app.js) can drive it without itself
   being a module.

   Geometry is procedural, built fresh per shape/carat/cut rather than
   loaded from assets — see buildBrilliantGeometry / buildPrincess /
   buildEmerald below for the faceting logic and SHAPE_DIMS for the
   real-world mm proportions each shape is scaled from.
   ============================================================== */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

/* ============================================================
   REAL-WORLD PROPORTIONS

   Anchor dimensions (length x width, mm) for a well-cut 1.00ct stone
   of each shape — typical published averages, not any one lab's exact
   figures. Scaled to other carats by the cube-root law (weight scales
   with volume, so linear size scales with carat^(1/3)), which is the
   same relationship real diamonds follow to first order.
   ============================================================== */
var SHAPE_DIMS_1CT = {
  round:    { length:6.5, width:6.5 },
  oval:     { length:7.7, width:5.7 },
  emerald:  { length:7.0, width:5.0 },
  princess: { length:5.5, width:5.5 },
  pear:     { length:8.0, width:5.3 },
  cushion:  { length:6.0, width:6.0 },
  marquise: { length:9.0, width:4.5 }
};

function shapeDimsMM(shape, carat){
  var anchor = SHAPE_DIMS_1CT[shape] || SHAPE_DIMS_1CT.round;
  var c = Math.max(0.2, carat || 1);
  var s = Math.pow(c, 1/3);
  return { length: anchor.length*s, width: anchor.width*s };
}

/* Cut grade nudges proportions in gemologically-plausible directions —
   a lower grade is usually cut deeper or shallower than ideal, not
   just "worse" in some vague sense. */
var CUT_PROPORTIONS = {
  'Excellent':  { tableFrac:0.57, crownAngle:34.5, pavAngle:40.75 },
  'Very Good':  { tableFrac:0.60, crownAngle:32.0, pavAngle:41.6 },
  'Good':       { tableFrac:0.63, crownAngle:29.5, pavAngle:43.2 },
  'Fair':       { tableFrac:0.66, crownAngle:27.0, pavAngle:44.8 }
};
function cutProportions(cut){ return CUT_PROPORTIONS[cut] || CUT_PROPORTIONS['Excellent']; }

/* ============================================================
   GEOMETRY HELPERS
   ============================================================ */
function cubicPoint(p0,p1,p2,p3,t){
  var mt = 1-t;
  var a = mt*mt*mt, b = 3*mt*mt*t, c = 3*mt*t*t, d = t*t*t;
  return { x:a*p0.x+b*p1.x+c*p2.x+d*p3.x, y:a*p0.y+b*p1.y+c*p2.y+d*p3.y };
}
function chainOutline(segs){
  return function(t){
    var n = segs.length;
    var tt = ((t%1)+1)%1 * n;
    var i = Math.min(n-1, Math.floor(tt));
    var localT = tt - i;
    var s = segs[i];
    return cubicPoint(s.p0, s.cp1, s.cp2, s.p1, localT);
  };
}

function circleOutline(halfW, halfL){
  return function(t){ var th=t*2*Math.PI; return { x:halfW*Math.cos(th), y:halfL*Math.sin(th) }; };
}
function cushionOutline(halfW, halfL){
  var n = 2.8;
  return function(t){
    var th = t*2*Math.PI;
    var c = Math.cos(th), s = Math.sin(th);
    var sc = Math.sign(c)||1, ss = Math.sign(s)||1;
    return { x: sc*Math.pow(Math.abs(c), 2/n)*halfW, y: ss*Math.pow(Math.abs(s), 2/n)*halfL };
  };
}
/* Pear/marquise outlines mirror the cubic-bezier silhouettes already
   validated in the 2D SVG renderer (app.js gemPear/gemMarquise), just
   re-parametrized in real mm instead of screen units, so the 3D stone
   reads as the same shape as the swatch icon and preview tray. */
function pearOutline(halfW, halfL){
  var w=halfW, hh=halfL;
  var segs = [
    { p0:{x:0,y:-hh}, cp1:{x:0.86*w,y:-0.55*hh}, cp2:{x:w,y:-0.05*hh}, p1:{x:w,y:0.32*hh} },
    { p0:{x:w,y:0.32*hh}, cp1:{x:w,y:0.76*hh}, cp2:{x:0.55*w,y:hh}, p1:{x:0,y:hh} },
    { p0:{x:0,y:hh}, cp1:{x:-0.55*w,y:hh}, cp2:{x:-w,y:0.76*hh}, p1:{x:-w,y:0.32*hh} },
    { p0:{x:-w,y:0.32*hh}, cp1:{x:-w,y:-0.05*hh}, cp2:{x:-0.86*w,y:-0.55*hh}, p1:{x:0,y:-hh} }
  ];
  return chainOutline(segs);
}
function marquiseOutline(halfW, halfL){
  var w=halfW, hh=halfL;
  var segs = [
    { p0:{x:0,y:-hh}, cp1:{x:0.58*w,y:-0.56*hh}, cp2:{x:w,y:-0.22*hh}, p1:{x:w,y:0} },
    { p0:{x:w,y:0}, cp1:{x:w,y:0.22*hh}, cp2:{x:0.58*w,y:0.56*hh}, p1:{x:0,y:hh} },
    { p0:{x:0,y:hh}, cp1:{x:-0.58*w,y:0.56*hh}, cp2:{x:-w,y:0.22*hh}, p1:{x:-w,y:0} },
    { p0:{x:-w,y:0}, cp1:{x:-w,y:-0.22*hh}, cp2:{x:-0.58*w,y:-0.56*hh}, p1:{x:0,y:-hh} }
  ];
  return chainOutline(segs);
}
function ellipseOutline(halfW, halfL){ return circleOutline(halfW, halfL); }

/* Flips any triangle whose normal points toward the shape's own
   centroid instead of away from it. Cheap, general fallback so the
   many hand-derived triangle windings below don't need to be proven
   correct by hand — works for any star-convex outline around the
   origin, which every gem shape here is. */
function fixWindingOutward(pos){
  for (var i=0;i<pos.length;i+=9){
    var ax=pos[i],ay=pos[i+1],az=pos[i+2];
    var bx=pos[i+3],by=pos[i+4],bz=pos[i+5];
    var cx=pos[i+6],cy=pos[i+7],cz=pos[i+8];
    var ux=bx-ax,uy=by-ay,uz=bz-az;
    var vx=cx-ax,vy=cy-ay,vz=cz-az;
    var nx=uy*vz-uz*vy, ny=uz*vx-ux*vz, nz=ux*vy-uy*vx;
    var mx=(ax+bx+cx)/3, my=(ay+by+cy)/3, mz=(az+bz+cz)/3;
    var dot = nx*mx+ny*my+nz*mz;
    if (dot < 0){
      pos[i+3]=cx; pos[i+4]=cy; pos[i+5]=cz;
      pos[i+6]=bx; pos[i+7]=by; pos[i+8]=bz;
    }
  }
}

function positionsToGeometry(pos){
  var geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  return geo;
}

/* ============================================================
   ROUND / OVAL / CUSHION / PEAR / MARQUISE — generalized brilliant

   All five are cut as variants of the same round-brilliant facet
   vocabulary (table, star, bezel/main, upper-girdle, pavilion-main,
   lower-girdle, culet) around a shape-specific outline curve instead
   of a true circle — which is how these are actually cut in the
   real world (an "oval brilliant", "cushion brilliant" etc are named
   for exactly this reason). Emerald and princess are NOT brilliants
   (step-cut and chevron-pavilion respectively) and get their own
   builders further down.
   ============================================================== */
function buildBrilliantGeometry(outlineFn, N, proportions){
  var tableFrac = proportions.tableFrac;
  var crownAngle = proportions.crownAngle * Math.PI/180;
  var pavAngle = proportions.pavAngle * Math.PI/180;
  var culetFrac = 0.035;
  var starFrac = 0.55, starLift = 0.16;
  var lgFrac = 0.55, lgLift = 0.16;

  var M = N*2;
  var girdle = [];
  for (var i=0;i<M;i++) girdle.push(outlineFn(i/M));
  var rSum = 0;
  for (i=0;i<M;i++) rSum += Math.hypot(girdle[i].x, girdle[i].y);
  var Rref = rSum/M;

  var zCrown = Rref*(1-tableFrac)*Math.tan(crownAngle);
  var pavDepth = Rref*(1-culetFrac)*Math.tan(pavAngle);

  function sc(p,f){ return { x:p.x*f, y:p.y*f }; }
  function lerp3(pA,zA,pB,zB,t){ return { x:pA.x+(pB.x-pA.x)*t, y:pA.y+(pB.y-pA.y)*t, z:zA+(zB-zA)*t }; }

  var table = [], culet = [];
  for (i=0;i<M;i+=2){
    var tp = sc(girdle[i], tableFrac); tp.z = zCrown; table.push(tp);
    var cp = sc(girdle[i], culetFrac); cp.z = -pavDepth; culet.push(cp);
  }

  var star = [], lowerG = [];
  for (i=1;i<M;i+=2){
    var g = girdle[i];
    var s = lerp3(sc(g,tableFrac), zCrown, g, 0, starFrac);
    s.z += (zCrown - s.z)*starLift;
    star.push(s);
    var lg = lerp3(g, 0, sc(g,culetFrac), -pavDepth, lgFrac);
    lg.z += (0 - lg.z)*lgLift;
    lowerG.push(lg);
  }

  var pos = [];
  function p3(p){ return { x:p.x, y:p.y, z:(p.z!=null?p.z:0) }; }
  function tri(a,b,c){ var pa=p3(a),pb=p3(b),pc=p3(c); pos.push(pa.x,pa.y,pa.z, pb.x,pb.y,pb.z, pc.x,pc.y,pc.z); }
  function quad(a,b,c,d){ tri(a,b,c); tri(a,c,d); }

  var tableCenter = { x:0, y:0, z:zCrown };
  var culetCenter = { x:0, y:0, z:-pavDepth };
  for (var k=0;k<N;k++){
    tri(tableCenter, table[k], table[(k+1)%N]);
    tri(culetCenter, culet[(k+1)%N], culet[k]);
  }

  for (k=0;k<N;k++){
    var Gm = girdle[2*k];
    var GmNext = girdle[(2*k+2)%M];
    var Ghalf = girdle[(2*k+1)%M];
    var Tm = table[k];
    var TmNext = table[(k+1)%N];
    var sPrev = star[(k-1+N)%N];
    var sNext = star[k];
    var Cm = culet[k];
    var CmNext = culet[(k+1)%N];
    var lsPrev = lowerG[(k-1+N)%N];
    var lsNext = lowerG[k];

    quad(Tm, sPrev, Gm, sNext);        /* bezel (crown main) kite */
    tri(Tm, TmNext, sNext);            /* star facet */
    tri(Gm, Ghalf, sNext);             /* upper girdle facet, half A */
    tri(Ghalf, GmNext, sNext);         /* upper girdle facet, half B */

    quad(Gm, lsPrev, Cm, lsNext);      /* pavilion main kite */
    tri(Ghalf, Gm, lsNext);            /* lower girdle facet, half A */
    tri(GmNext, Ghalf, lsNext);        /* lower girdle facet, half B */
  }

  fixWindingOutward(pos);
  var geo = positionsToGeometry(pos);
  return { geometry: geo, crownHeight: zCrown, pavDepth: pavDepth };
}

/* ============================================================
   PRINCESS — square brilliant-cut crown over a chevron/pyramid
   pavilion. Real princess cuts vary widely in facet count (50-76)
   by cutter; this captures the defining silhouette (square, faceted
   ring around the table, four large pavilion facets meeting near a
   point) rather than any one house's exact recipe.
   ============================================================== */
function buildPrincessGeometry(halfW, halfL, proportions){
  var tableFrac = proportions.tableFrac * 0.85; /* princess tables run smaller relative to girdle than round */
  var crownAngle = proportions.crownAngle * Math.PI/180;
  var pavAngle = (proportions.pavAngle+2) * Math.PI/180; /* princess pavilions run a touch steeper */
  var Rref = (halfW+halfL)/2;
  var zCrown = Rref*(1-tableFrac)*Math.tan(crownAngle);
  var pavDepth = Rref*Math.tan(pavAngle);

  var girdle = [
    { x:halfW, y:-halfL }, { x:halfW, y:halfL }, { x:-halfW, y:halfL }, { x:-halfW, y:-halfL }
  ];
  var table = girdle.map(function(p){ return { x:p.x*tableFrac, y:p.y*tableFrac, z:zCrown }; });
  var apex = { x:0, y:0, z:-pavDepth };

  var pos = [];
  function tri(a,b,c){ pos.push(a.x,a.y,a.z||0, b.x,b.y,b.z||0, c.x,c.y,c.z||0); }

  for (var k=0;k<4;k++){
    var g0 = girdle[k], g1 = girdle[(k+1)%4];
    var t0 = table[k], t1 = table[(k+1)%4];
    tri(g0, g1, t1);
    tri(g0, t1, t0);
    tri(g0, g1, apex);
  }
  fixWindingOutward(pos);
  var geo = positionsToGeometry(pos);
  return { geometry: geo, crownHeight: zCrown, pavDepth: pavDepth };
}

/* ============================================================
   EMERALD — step cut: concentric chamfered rectangles, "steps"
   between them instead of radial facets. Ports the chamfer-octagon
   shape already used by the 2D SVG renderer (app.js gemEmerald).
   ============================================================== */
function chamferRing(halfW, halfL, chamfer){
  var w=halfW, l=halfL, c=chamfer;
  return [
    { x:w-c, y:-l }, { x:w, y:-l+c },
    { x:w, y:l-c },  { x:w-c, y:l },
    { x:-(w-c), y:l }, { x:-w, y:l-c },
    { x:-w, y:-l+c }, { x:-(w-c), y:-l }
  ];
}
function buildEmeraldGeometry(halfW, halfL, proportions){
  var crownAngle = proportions.crownAngle * Math.PI/180;
  var pavAngle = proportions.pavAngle * Math.PI/180;
  var Rref = (halfW+halfL)/2;
  var zCrown = Rref*0.42*Math.tan(crownAngle);
  var pavDepth = Rref*0.9*Math.tan(pavAngle);
  var chamfer = Math.min(halfW,halfL)*0.32;

  var girdle = chamferRing(halfW, halfL, chamfer);
  var crownStep = chamferRing(halfW*0.8, halfL*0.8, chamfer*0.8).map(function(p){ return { x:p.x,y:p.y,z:zCrown*0.55 }; });
  var table = chamferRing(halfW*0.56, halfL*0.56, chamfer*0.56).map(function(p){ return { x:p.x,y:p.y,z:zCrown }; });
  var pavStep = chamferRing(halfW*0.72, halfL*0.72, chamfer*0.72).map(function(p){ return { x:p.x,y:p.y,z:-pavDepth*0.5 }; });
  var bottom = chamferRing(halfW*0.32, halfL*0.32, chamfer*0.32).map(function(p){ return { x:p.x,y:p.y,z:-pavDepth }; });
  var girdle3 = girdle.map(function(p){ return { x:p.x,y:p.y,z:0 }; });

  var pos = [];
  function tri(a,b,c){ pos.push(a.x,a.y,a.z, b.x,b.y,b.z, c.x,c.y,c.z); }
  function ringBand(outer, inner){
    for (var i=0;i<8;i++){
      var o0=outer[i], o1=outer[(i+1)%8], i0=inner[i], i1=inner[(i+1)%8];
      tri(o0,o1,i1); tri(o0,i1,i0);
    }
  }
  ringBand(girdle3, crownStep);
  ringBand(crownStep, table);
  ringBand(girdle3, pavStep);
  ringBand(pavStep, bottom);

  var tableCenter = { x:0,y:0,z:zCrown };
  for (var k=0;k<8;k++) tri(tableCenter, table[k], table[(k+1)%8]);
  var bottomCenter = { x:0,y:0,z:-pavDepth };
  for (k=0;k<8;k++) tri(bottomCenter, bottom[(k+1)%8], bottom[k]);

  fixWindingOutward(pos);
  var geo = positionsToGeometry(pos);
  return { geometry: geo, crownHeight: zCrown, pavDepth: pavDepth };
}

/* ============================================================
   DISPATCH
   ============================================================ */
function buildGemGeometry(shape, carat, cut){
  var dims = shapeDimsMM(shape, carat);
  var halfW = dims.width/2, halfL = dims.length/2;
  var proportions = cutProportions(cut);
  var result;
  switch(shape){
    case 'oval':     result = buildBrilliantGeometry(ellipseOutline(halfW,halfL), 10, proportions); break;
    case 'cushion':  result = buildBrilliantGeometry(cushionOutline(halfW,halfL), 10, proportions); break;
    case 'pear':     result = buildBrilliantGeometry(pearOutline(halfW,halfL), 12, proportions); break;
    case 'marquise': result = buildBrilliantGeometry(marquiseOutline(halfW,halfL), 10, proportions); break;
    case 'princess': result = buildPrincessGeometry(halfW, halfL, proportions); break;
    case 'emerald':  result = buildEmeraldGeometry(halfW, halfL, proportions); break;
    case 'round':
    default:         result = buildBrilliantGeometry(circleOutline(halfW,halfW), 8, proportions); break;
  }
  return {
    geometry: result.geometry, lengthMM: dims.length, widthMM: dims.width,
    crownHeightMM: result.crownHeight, pavDepthMM: result.pavDepth,
    depthMM: result.crownHeight + result.pavDepth
  };
}

/* ============================================================
   SCENE
   ============================================================ */
var REF_RING_DIAMETER_MM = 16.51; /* US size 6, worn-scale reference */
var REF_BAND_TUBE_MM = 0.9;
var REF_BAND_MAJOR_MM = REF_RING_DIAMETER_MM/2;

function makeDiamondMaterial(thicknessMM, envMap){
  return new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0,
    roughness: 0.02,
    transmission: 1,
    ior: 2.42,
    thickness: Math.max(0.5, thicknessMM),
    dispersion: 0.4,
    envMap: envMap,
    envMapIntensity: 1.6,
    clearcoat: 0.15,
    clearcoatRoughness: 0.05,
    flatShading: true,
    attenuationColor: 0xffffff,
    attenuationDistance: 8
  });
}

function buildState(container){
  var width = container.clientWidth || 300, height = container.clientHeight || 300;

  var renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1, 2));
  renderer.setSize(width, height);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  container.appendChild(renderer.domElement);

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(38, width/height, 0.1, 500);

  var pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  var keyLight = new THREE.PointLight(0xffffff, 60, 0, 2);
  keyLight.position.set(8, 14, 10);
  scene.add(keyLight);
  var fillLight = new THREE.PointLight(0xfff2e0, 22, 0, 2);
  fillLight.position.set(-10, 6, 8);
  scene.add(fillLight);
  var rimLight = new THREE.PointLight(0xe8f0ff, 30, 0, 2);
  rimLight.position.set(0, 8, -14);
  scene.add(rimLight);
  scene.add(new THREE.AmbientLight(0xffffff, 0.15));

  var controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.maxPolarAngle = Math.PI*0.82;
  controls.minPolarAngle = Math.PI*0.08;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 1.1;
  controls.addEventListener('start', function stopAutoRotate(){
    controls.autoRotate = false;
    controls.removeEventListener('start', stopAutoRotate);
  });

  var refBandGeo = new THREE.TorusGeometry(REF_BAND_MAJOR_MM, REF_BAND_TUBE_MM, 20, 64);
  var refBandMat = new THREE.MeshStandardMaterial({ color:0xC9CAC3, metalness:0.9, roughness:0.28, envMap:scene.environment, envMapIntensity:1 });
  var refBand = new THREE.Mesh(refBandGeo, refBandMat);
  refBand.rotation.x = Math.PI/2;
  refBand.position.y = 0;
  scene.add(refBand);

  var gemGroup = new THREE.Group();
  scene.add(gemGroup);
  var gemMesh = null;

  var frameId = null;
  function animate(){
    frameId = requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }
  animate();

  var ro = new ResizeObserver(function(){
    var w = container.clientWidth || 1, h = container.clientHeight || 1;
    camera.aspect = w/h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  });
  ro.observe(container);

  return {
    renderer:renderer, scene:scene, camera:camera, controls:controls,
    gemGroup:gemGroup, gemMesh:gemMesh, refBand:refBand, refBandMat:refBandMat,
    frameId:frameId, ro:ro, pmrem:pmrem, hasFramed:false
  };
}

function applyState(state, opts){
  var shape = opts.shape || 'round';
  var carat = opts.carat || 1;
  var cut = opts.cut || 'Excellent';
  var metalColors = opts.metalColors || { light:'#F7F7F4', mid:'#C9CAC3', dark:'#A6A79E' };

  var built = buildGemGeometry(shape, carat, cut);

  if (state.gemMesh){
    state.gemGroup.remove(state.gemMesh);
    state.gemMesh.geometry.dispose();
    state.gemMesh.material.dispose();
  }
  var mat = makeDiamondMaterial(built.depthMM, state.scene.environment);
  var mesh = new THREE.Mesh(built.geometry, mat);
  /* Gem geometry is built with +z as "up" (crown); scene up is +y.
     Seat the culet flush on the reference band's top surface rather
     than at some fixed offset, so different depths (shape/cut) don't
     bury the stone in the band or float it above. */
  mesh.rotation.x = -Math.PI/2;
  /* The band is a torus (hole-axis = Y) — its material sits in a ring
     around the Y axis, not at the origin, which is the hole. Seat the
     gem at the front of that ring (nearest the camera, +Z), where the
     tube's peak is exactly REF_BAND_TUBE_MM above y=0. */
  var bandTopY = REF_BAND_TUBE_MM;
  var seatZ = REF_BAND_MAJOR_MM;
  mesh.position.set(0, bandTopY + built.pavDepthMM, seatZ);
  state.gemGroup.add(mesh);
  state.gemMesh = mesh;

  state.refBandMat.color.set(metalColors.mid);
  state.refBandMat.emissive = new THREE.Color(metalColors.light);
  state.refBandMat.emissiveIntensity = 0.06;

  var gemSize = Math.max(built.lengthMM, built.widthMM);
  var targetY = bandTopY + built.depthMM*0.5;
  state.controls.target.set(0, targetY, seatZ);
  state.controls.minDistance = gemSize*2.1;
  state.controls.maxDistance = gemSize*7.5;

  if (!state.hasFramed){
    var dist = gemSize*3.4;
    var dir = new THREE.Vector3(0.85, 1.05, 2.05).normalize();
    state.camera.position.copy(state.controls.target).addScaledVector(dir, dist);
    state.hasFramed = true;
  } else {
    var offset = state.camera.position.clone().sub(state.controls.target);
    var curDist = offset.length() || 1;
    var clamped = Math.max(state.controls.minDistance, Math.min(state.controls.maxDistance, curDist));
    offset.setLength(clamped);
    state.camera.position.copy(state.controls.target).add(offset);
  }
  state.controls.update();
}

var registry = new WeakMap();

function mount(container, opts){
  if (!container || registry.has(container)) return;
  var state = buildState(container);
  registry.set(container, state);
  applyState(state, opts||{});
}
function update(container, opts){
  var state = registry.get(container);
  if (!state){ mount(container, opts); return; }
  applyState(state, opts||{});
}
function unmount(container){
  var state = registry.get(container);
  if (!state) return;
  cancelAnimationFrame(state.frameId);
  state.ro.disconnect();
  state.controls.dispose();
  state.renderer.dispose();
  state.pmrem.dispose();
  if (state.gemMesh){ state.gemMesh.geometry.dispose(); state.gemMesh.material.dispose(); }
  state.refBand.geometry.dispose();
  state.refBandMat.dispose();
  if (state.renderer.domElement.parentNode) state.renderer.domElement.parentNode.removeChild(state.renderer.domElement);
  registry.delete(container);
}

window.GracieDiamond3D = { mount:mount, update:update, unmount:unmount };
