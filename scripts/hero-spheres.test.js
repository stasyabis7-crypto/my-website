'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Execute the real controller with browser APIs stubbed. In particular, deliver
// multiple visibility changes in one callback, as cached navigation can do.
const frames = new Map();
const pageEvents=new Map(),documentEvents=new Map();
const listen=(events,name,callback)=>events.set(name,[...(events.get(name)||[]),callback]);
const heroClasses=new Set();
const revealSceneStates=[];
let frameId = 0;
let visibilityObserver;
let drawn=[];
let transform={x:0,y:0,angle:0};
let textureId=0;
const box = { width: 1400, height: 850, top: 0, left: 0, right: 1400, bottom: 850 };
const context = new Proxy({}, {
  get(_, key) {
    if (key === 'clearRect') return () => { drawn=[]; };
    if (key === 'drawImage') return (image,x,y,width) => { if(typeof image.id==='number')drawn.push({...transform,id:image.id,r:width/2}); };
    if (key === 'rotate') return angle => { transform.angle=angle; };
    if (key === 'translate') return (x,y) => { transform={x,y,angle:0}; };
    if (key === 'getImageData' || key === 'createImageData') return () => ({ data: new Uint8ClampedArray(420 * 420 * 4) });
    if (key === 'createRadialGradient') return () => ({ addColorStop() {} });
    return () => {};
  },
  set() { return true; }
});
const canvas = { getContext: () => context, dataset: {} };
const title = {
  textContent: 'Test heading', setAttribute() {}, replaceChildren() {},
  querySelectorAll: () => []
};
const stage = { getBoundingClientRect: () => box };
const content = { getBoundingClientRect: () => ({ ...box, top: 160, bottom: 440 }), querySelectorAll: () => [{ matches:()=>true, getBoundingClientRect:()=>({left:480,right:920,top:250,bottom:450,width:440,height:200}) }] };
const root = { matches: () => false };
const hero = {
  classList: { add(name) { heroClasses.add(name); if(name==='is-revealing')revealSceneStates.push(!!canvas.dataset.sphereCount); }, remove(name) { heroClasses.delete(name); }, contains: name=>heroClasses.has(name) },
  querySelector: selector => ({ '.hero-spheres': canvas, '.mood-stage': stage, '.mood-content': content, '.mood-title': title })[selector]
};
const document = {
  hidden: false, documentElement: root, fonts: { ready: Promise.resolve() },
  querySelector: selector => selector === '.mood-hero--spheres' ? hero : { getBoundingClientRect: () => ({ left: 0, top: 0, right: 350, bottom: 80 }) },
  createElement: tag => tag === 'canvas' ? { id:textureId++, getContext: () => context } : { style: { setProperty() {} }, setAttribute() {} },
  createTextNode: text => ({ textContent: text }),
  addEventListener: (name,callback)=>listen(documentEvents,name,callback)
};
const sandbox = {
  console, document, devicePixelRatio: 1,
  performance: { now: () => 1 },
  matchMedia: () => ({ matches: false, addEventListener() {} }),
  addEventListener: (name,callback)=>listen(pageEvents,name,callback),
  requestAnimationFrame: callback => { const id = ++frameId; frames.set(id, callback); return id; },
  cancelAnimationFrame: id => frames.delete(id),
  MutationObserver: class { observe() {} disconnect() {} },
  ResizeObserver: class { observe() {} },
  IntersectionObserver: class { constructor(callback) { this.deliver = callback; visibilityObserver = this; } observe() {} },
  Image: class { constructor() { this.width = this.height = 1200; } set src(_) { this.onload(); } }
};

(async () => {
  const source = fs.readFileSync(path.join(__dirname, '../components/hero-mood/hero-spheres.js'), 'utf8');
  await vm.runInNewContext(source, sandbox);
  assert.equal(frames.size, 1, 'Visible hero starts an animation frame');
  assert.ok(revealSceneStates.length&&revealSceneStates.every(Boolean),'Copy reveal waits for the sphere scene instead of finishing while assets load');
  visibilityObserver.deliver([{ target: canvas, isIntersecting: false }, { target: canvas, isIntersecting: true }]);
  assert.equal(frames.size, 1, 'A cached-load batch ending visible must keep the animation running');
  visibilityObserver.deliver([{ target: canvas, isIntersecting: true }, { target: canvas, isIntersecting: false }]);
  assert.equal(frames.size, 0, 'A batch ending offscreen pauses the animation');
  visibilityObserver.deliver([{ target: canvas, isIntersecting: true }]);
  assert.equal(frames.size, 1, 'Returning onscreen resumes exactly one frame loop');
  assert.equal(drawn.length,0,'Spheres stay invisible before their entrance');
  const first=new Map(),previous=new Map(),arrivals=new Set();
  let bounced=false;
  const behindText=new Set();
  for(let tick=1;tick<=1200&&frames.size;tick++){
    const [id,callback]=frames.entries().next().value;
    frames.delete(id);callback(1+tick*1000/60);
    for(let a=0;a<drawn.length;a++)for(let b=a+1;b<drawn.length;b++){
      const p=drawn[a],q=drawn[b];
      assert.ok(Math.hypot(p.x-q.x,p.y-q.y)>=p.r+q.r-.5,'Falling spheres must not overlap');
    }
    for(const p of drawn){
      if(!first.has(p.id)){
        first.set(p.id,p);arrivals.add(tick);
        assert.ok(p.y<0,'Each sphere enters from above the banner');
      }
      if(p.x>480&&p.x<920&&p.y>250&&p.y<450)behindText.add(p.id);
      const before=previous.get(p.id);
      if(before)assert.ok(Math.hypot(p.x-before.x,p.y-before.y)<35,'No sudden sideways relocation during a fall');
      if(before&&p.y<before.y-.1&&before.y>box.height*.5)bounced=true;
      assert.equal(p.angle,0,'Pictures stay upright while falling');
      previous.set(p.id,p);
    }
  }
  assert.equal(frames.size,0,'Settled spheres must stop scheduling expensive canvas frames during scrolling');
  assert.equal(drawn.length,40,'Every picture joins the pile');
  assert.ok(behindText.size>=4,'Spheres must fall through the middle behind the copy as well as at the sides');
  assert.ok(arrivals.size>=20,'Drops are staggered instead of appearing together');
  assert.ok(bounced,'Spheres rebound softly after contacting the floor or each other');
  assert.ok(drawn.every(p=>p.y-first.get(p.id).y>250),'Every sphere falls down into the banner');
  assert.ok(drawn.every(p=>p.y+p.r<=box.height+1),'The pile stays above the banner floor');
  document.hidden=true;
  for(const callback of pageEvents.get('pageshow'))callback({persisted:true});
  assert.ok(heroClasses.has('is-reveal-pending')&&!heroClasses.has('is-revealing'),
    'Restored hidden pages wait to replay the copy instead of finishing unseen');
  document.hidden=false;
  for(const callback of documentEvents.get('visibilitychange'))callback();
  assert.ok(heroClasses.has('is-revealing')&&!heroClasses.has('is-reveal-pending'),
    'Heading and button reveal starts when the restored page becomes visible');
  console.log('Hero spheres: batched visibility changes, pause and resume verified.');
})().catch(error => { console.error(error.message); process.exitCode = 1; });
