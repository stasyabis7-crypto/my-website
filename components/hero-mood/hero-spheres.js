/* Glass image spheres: rigid silhouettes, staggered nine-second loop. */
(async () => {
  'use strict';
  const hero=document.querySelector('.mood-hero--spheres');
  if (!hero) return;
  const canvas=hero.querySelector('.hero-spheres');
  const ctx=canvas?.getContext('2d');
  const stage=hero.querySelector('.mood-stage'), content=hero.querySelector('.mood-content');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const title = hero.querySelector('.mood-title');
  // Preserve the heading's accessible name and spaces, including Cyrillic copy.
  const words = title.textContent.trim().split(/\s+/);
  title.setAttribute('aria-label', title.textContent.trim());
  title.replaceChildren(...words.flatMap((word, i) => {
    const span = document.createElement('span');
    span.className = 'hero-reveal-word';
    span.setAttribute('aria-hidden', 'true');
    span.style.setProperty('--reveal-delay', `${i * .13}s`);
    span.textContent = word;
    return i ? [document.createTextNode(' '), span] : [span];
  }));
  hero.classList.add('is-reveal-pending');
  const reveal = () => {
    if (document.documentElement.matches('.is-page-loading, .is-transition-pending')) return;
    const lines = [];
    title.querySelectorAll('.hero-reveal-word').forEach(word => {
      if (!lines.includes(word.offsetTop)) lines.push(word.offsetTop);
      word.style.setProperty('--reveal-delay', `${lines.indexOf(word.offsetTop) * .18}s`);
    });
    hero.classList.remove('is-reveal-pending');
    hero.classList.add('is-revealing');
    observer.disconnect();
  };
  const observer = new MutationObserver(reveal);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  reveal();
  if (!ctx) return;
  const paths = [
    'components/page-hero/pictures/sphere-01.webp',
    'components/page-hero/pictures/sphere-02.webp',
    'components/page-hero/pictures/sphere-03.webp',
    'components/page-hero/pictures/sphere-04.webp',
    'components/page-hero/pictures/sphere-05.webp',
    'components/page-hero/pictures/sphere-06.webp',
    'components/page-hero/pictures/sphere-07.webp',
    'components/page-hero/pictures/sphere-08.webp',
    'components/page-hero/pictures/sphere-09.webp',
    'components/page-hero/pictures/sphere-10.webp',
    'components/page-hero/pictures/sphere-11.webp',
    'components/page-hero/pictures/sphere-12.webp',
    'components/page-hero/pictures/sphere-13.webp',
    'components/page-hero/pictures/sphere-14.webp',
    'components/page-hero/pictures/sphere-15.webp',
    'components/page-hero/pictures/sphere-16.webp',
    'components/page-hero/pictures/sphere-17.webp',
    'components/page-hero/pictures/sphere-18.webp',
    'components/page-hero/pictures/sphere-19.webp',
    'components/page-hero/pictures/sphere-20.webp',
    'components/page-hero/pictures/sphere-21.webp',
    'components/page-hero/pictures/sphere-22.webp',
    'components/page-hero/pictures/sphere-23.webp',
    'components/page-hero/pictures/sphere-24.webp',
    'components/page-hero/pictures/sphere-25.webp',
    'components/page-hero/pictures/sphere-26.webp',
    'components/page-hero/pictures/sphere-27.webp',
    'components/page-hero/pictures/sphere-28.webp',
    'components/page-hero/pictures/sphere-29.webp',
    'components/page-hero/pictures/sphere-30.webp',
    'components/page-hero/pictures/sphere-31.webp',
    'components/page-hero/pictures/sphere-32.webp',
    'components/page-hero/pictures/sphere-33.webp',
    'components/page-hero/pictures/sphere-34.webp',
    'components/page-hero/pictures/sphere-35.webp',
    'components/page-hero/pictures/sphere-36.webp',
    'components/page-hero/pictures/sphere-37.webp',
    'components/page-hero/pictures/sphere-38.webp',
    'components/page-hero/pictures/sphere-39.webp',
    'components/page-hero/pictures/sphere-40.webp'
  ];
  const textures = await Promise.all(paths.map(path => new Promise(resolve => {
    const image = new Image();
    image.onload = () => {
      try { resolve(makeGlass(image)); }
      catch (error) { console.warn('Sphere texture unavailable:', path, error); resolve(makeGlass(null)); }
    };
    image.onerror = () => resolve(makeGlass(null));
    image.src = path;
  })));
  function makeGlass(image) {
    const size=420, source=document.createElement('canvas'), out=document.createElement('canvas');
    source.width=source.height=out.width=out.height=size;
    const s=source.getContext('2d'), o=out.getContext('2d');
    if (image) {
      const crop=Math.min(image.width,image.height);
      s.drawImage(image,(image.width-crop)/2,(image.height-crop)/2,crop,crop,0,0,size,size);
    } else {
      s.fillStyle='#333b48';s.fillRect(0,0,size,size);
    }
    const pixels=s.getImageData(0,0,size,size).data, result=o.createImageData(size,size);
    for(let y=0;y<size;y++) for(let x=0;x<size;x++) {
      const nx=(x+.5-size/2)/(size/2), ny=(y+.5-size/2)/(size/2), r=Math.hypot(nx,ny);
      if(r>1) continue;
      // Convex lens: enlarged centre, steep compression at the circular rim.
      const lens=.72+.28*r*r*r*r, ripple=.0025*Math.sin(nx*75+Math.sin(ny*40));
      const sx=Math.max(0,Math.min(size-1,Math.round((nx*lens+ripple+1)*.5*(size-1))));
      const sy=Math.max(0,Math.min(size-1,Math.round((ny*lens+ripple+1)*.5*(size-1))));
      const a=(y*size+x)*4,b=(sy*size+sx)*4;
      const shade=.94-.30*Math.pow(r,5), grain=Math.sin(x*12.9898+y*78.233)*1.2;
      for(let c=0;c<3;c++) result.data[a+c]=pixels[b+c]*shade+grain;
      result.data[a+3]=Math.min(255,(1-r)*size*128);
    }
    o.putImageData(result,0,0);
    const circle=()=>{o.beginPath();o.arc(210,210,208,0,Math.PI*2);};
    circle();o.save();o.clip();
    let g=o.createRadialGradient(150,110,10,210,210,210);
    g.addColorStop(0,'#ffffff32');g.addColorStop(.48,'#ffffff00');g.addColorStop(.83,'#d0e9ff08');g.addColorStop(.94,'#d9f4ff88');g.addColorStop(1,'#ffffff18');o.fillStyle=g;o.fillRect(0,0,size,size);
    o.translate(210,210);o.rotate(-.5);
    o.beginPath();o.ellipse(-35,-149,86,15,0,0,Math.PI*2);o.fillStyle='#ffffffb0';o.filter='blur(6px)';o.fill();
    o.filter='blur(2px)';o.beginPath();o.ellipse(25,177,58,5,0,0,Math.PI*2);o.fillStyle='#d8eaffae';o.fill();o.restore();
    circle();o.lineWidth=2;o.strokeStyle='#ffffff65';o.stroke();
    return out;
  }
  let time=reduced.matches?4:0,last=0,w=0,h=0,headerBottom=0,obstacles=[];
  let anchors=[],entryCenter={x:0,y:0},frame=0,visible=true;
  function resize(){
    const bounds=stage.getBoundingClientRect();
    if (w===bounds.width && h===bounds.height) return;
    w=bounds.width;h=bounds.height;
    obstacles=[];
    for(const el of content.querySelectorAll('h1,p,a')){
      const rects=[];
      if(el.matches('a'))rects.push(el.getBoundingClientRect());
      else {
        const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);
        while(walker.nextNode()){
          const range=document.createRange();range.selectNodeContents(walker.currentNode);
          rects.push(...range.getClientRects());
        }
      }
      for(const b of rects)if(b.width>0)obstacles.push({left:b.left-bounds.left-9,right:b.right-bounds.left+9,top:b.top-bounds.top-7,bottom:b.bottom-bounds.top+7});
    }
    const header=document.querySelector('.site-header').getBoundingClientRect();
    headerBottom=header.bottom-bounds.top;
    obstacles.push({left:header.left-bounds.left-6,right:header.right-bounds.left+6,top:header.top-bounds.top-6,bottom:header.bottom-bounds.top+6});
    const d=Math.min(devicePixelRatio,2);canvas.width=w*d;canvas.height=h*d;ctx.setTransform(d,0,0,d,0,0);
    const mobile=w<600,base=mobile?w/11.8:Math.min(w/23,64),pool=[];
    let row=0;
    for(let y=106+base*.5;y<h-65;y+=base*1.78,row++){
      for(let x=base*.45+(row%2)*base;x<w+base*.2;x+=base*2.05){
        const r=base*(.87+.24*(.5+.5*Math.sin(row*13+x)));
        const candidate={x,y,r};
        if(!obstacles.some(box=>Math.hypot(x-Math.max(box.left,Math.min(box.right,x)),y-Math.max(box.top,Math.min(box.bottom,y)))<r+5))pool.push(candidate);
      }
    }
    const count=Math.min(mobile?24:40,pool.length);
    anchors=Array.from({length:count},(_,i)=>{const p=pool[Math.floor(i*pool.length/count)];const sizes=[1.55,.72,1.05,.82,1.3,.68,1.08,.9];return {...p,r:p.r*sizes[i%sizes.length],i};});
    // Reserve room for translation before laying out the stationary composition.
    for(const p of anchors){p.floatRoom=mobile?7:12;p.r+=p.floatRoom;}
    // Interleave the entry order across the field, avoiding simultaneous rows.
    anchors.forEach((p,i)=>p.order=(i*7)%count);
    // Resolve the resting composition once. Moving collision targets used to
    // redirect spheres during entry and make their springs double back.
    for(let pass=0;pass<60;pass++){
      for(let a=0;a<anchors.length;a++)for(let b=a+1;b<anchors.length;b++){
        const p=anchors[a],q=anchors[b],dx=q.x-p.x,dy=q.y-p.y;
        const distance=Math.hypot(dx,dy)||1,gap=p.r+q.r+8;
        if(distance<gap){const push=(gap-distance)*.5;p.x-=dx/distance*push;p.y-=dy/distance*push;q.x+=dx/distance*push;q.y+=dy/distance*push;}
      }
      anchors.forEach(protect);
    }
    separate(anchors,true);
    for(const p of anchors)p.r-=p.floatRoom;
    for(const p of anchors){
      let clearance=p.floatRoom;
      for(const q of anchors)if(q!==p)clearance=Math.min(clearance,(Math.hypot(p.x-q.x,p.y-q.y)-p.r-q.r-2)/2);
      for(const box of obstacles){
        const distance=Math.hypot(p.x-Math.max(box.left,Math.min(box.right,p.x)),p.y-Math.max(box.top,Math.min(box.bottom,p.y)));
        clearance=Math.min(clearance,distance-p.r-1);
      }
      p.floatScale=Math.max(0,clearance/p.floatRoom);
    }
    const contentBounds=content.getBoundingClientRect();
    entryCenter={x:w/2,y:(contentBounds.top+contentBounds.bottom)/2-bounds.top};
    const planned=[];
    const radialOrder=[...anchors].sort((a,b)=>Math.hypot(a.x-entryCenter.x,a.y-entryCenter.y)-Math.hypot(b.x-entryCenter.x,b.y-entryCenter.y));
    for(const p of radialOrder){
      const dx=p.x-entryCenter.x,dy=p.y-entryCenter.y;
      const sx=dx>0?(w+p.r+30-entryCenter.x)/dx:dx<0?(-p.r-30-entryCenter.x)/dx:Infinity;
      const sy=dy>0?(h+p.r+30-entryCenter.y)/dy:dy<0?(-p.r-30-entryCenter.y)/dy:Infinity;
      p.entryScale=Math.max(1,Math.min(sx,sy));
      p.duration=1.05+((p.i*17+3)%19)/18*1.05;
      p.delay=.18+((p.i*13+5)%23)/22*1.45;
      // Inner spheres enter first wherever paths share space. Schedule once,
      // so independent speeds never require mid-flight pushes or reversals.
      const conflicts=()=>planned.some(q=>{
        const end=Math.max(p.delay+p.duration,q.delay+q.duration);
        for(let t=p.delay;t<=end+1/60;t+=1/60){
          if(t<q.delay)continue;
          const a=entryPosition(p,t),b=entryPosition(q,t);
          const floatingRoom=(t>=p.delay+p.duration?p.floatRoom*p.floatScale:0)+
            (t>=q.delay+q.duration?q.floatRoom*q.floatScale:0);
          if(Math.hypot(a.x-b.x,a.y-b.y)<p.r+q.r+2+floatingRoom)return true;
        }
        return false;
      });
      const latest=planned.reduce((end,q)=>Math.max(end,q.delay+q.duration),p.delay);
      while(p.delay<latest&&conflicts())p.delay=Math.min(latest,p.delay+.08);
      planned.push(p);
    }
    wake();
  }

  function protect(p){
    for(const box of obstacles){
      const nx=Math.max(box.left,Math.min(box.right,p.x)),ny=Math.max(box.top,Math.min(box.bottom,p.y));
      let dx=p.x-nx,dy=p.y-ny,dist=Math.hypot(dx,dy);
      if(dist<p.r+3){
        if(dist<.01){dx=p.x<w/2?-1:1;dy=0;dist=1;}
        const push=p.r+3-dist;p.x+=dx/dist*push;p.y+=dy/dist*push;
      }
    }
  }
  function separate(positions,confine){
    for(let pass=0;pass<24;pass++){
      let correction=0;
      for(const p of positions){
        const previousX=p.x,previousY=p.y;
        if(confine){
          p.x=Math.max(p.r*.35,Math.min(w-p.r*.35,p.x));
          p.y=Math.max(headerBottom+p.r+8,Math.min(h-p.r-8,p.y));
        }
        protect(p);
        correction=Math.max(correction,Math.abs(p.x-previousX),Math.abs(p.y-previousY));
      }
      for(let a=0;a<positions.length;a++)for(let b=a+1;b<positions.length;b++){
        const p=positions[a],q=positions[b],dx=q.x-p.x,dy=q.y-p.y;
        const distance=Math.hypot(dx,dy)||.001,gap=p.r+q.r+6;
        if(distance<gap){const push=(gap-distance)*.5;correction=Math.max(correction,push);p.x-=dx/distance*push;p.y-=dy/distance*push;q.x+=dx/distance*push;q.y+=dy/distance*push;}
      }
      if(correction<.02)break;
    }
  }
  function entryPosition(anchor,now){
    const enter=Math.max(0,Math.min(1,(now-anchor.delay)/anchor.duration));
    const ease=1-Math.pow(1-enter,3);
    const scale=1+(anchor.entryScale-1)*(1-ease);
    return {x:entryCenter.x+(anchor.x-entryCenter.x)*scale,
      y:entryCenter.y+(anchor.y-entryCenter.y)*scale,ease};
  }
  function draw(now){
    const dt=!reduced.matches&&last?Math.max(0,Math.min((now-last)/1000,.05)):0;
    time+=dt;last=now;ctx.clearRect(0,0,w,h);
    const positions=[];
    for(const anchor of anchors){
      const {i,r}=anchor;
      if(time<=anchor.delay&&!reduced.matches)continue;
      const point=entryPosition(anchor,reduced.matches?Infinity:time);
      const p={i,r,x:point.x,y:point.y};
      const floatTime=reduced.matches?0:Math.max(0,time-anchor.delay-anchor.duration);
      const fade=Math.min(1,floatTime/.35);
      const blend=fade*fade*(3-2*fade)*anchor.floatScale;
      const rhythm=.7+(i%7)*.045;
      p.x+=Math.sin(floatTime*rhythm+i*2.4)*(w<600?4:7)*blend;
      p.y+=Math.cos(floatTime*rhythm*.83+i*1.7)*(w<600?5:9)*blend;
      positions.push(p);
    }
    // Each sphere floats locally inside its reserved space; pictures stay upright.
    for(const p of positions){
      ctx.save();ctx.translate(p.x,p.y);
      ctx.shadowColor='#00000060';ctx.shadowBlur=9;ctx.shadowOffsetY=5;
      ctx.drawImage(textures[p.i],-p.r,-p.r,p.r*2,p.r*2);ctx.restore();
    }
    canvas.dataset.sphereCount=String(anchors.length);
    frame=0;
    if (canAnimate()) frame=requestAnimationFrame(draw);
  }
  function canAnimate() {
    return visible && !document.hidden && !reduced.matches &&
      !document.documentElement.matches('.is-page-loading, .is-transition-pending');
  }
  function wake() {
    cancelAnimationFrame(frame);frame=0;last=0;
    if (w && h) draw(performance.now());
  }
  await document.fonts.ready;
  new ResizeObserver(resize).observe(stage);
  const visibilityObserver=new IntersectionObserver(entries=>{
    // A cached reload can detach/reinsert the hero during layout and deliver
    // [offscreen, onscreen] together. The final entry is the current state.
    const entry=entries[entries.length-1];
    if(!entry||visible===entry.isIntersecting)return;
    visible=entry.isIntersecting;wake();
  });
  visibilityObserver.observe(canvas);
  document.addEventListener('visibilitychange',wake);
  addEventListener('pageshow',()=>{time=reduced.matches?4:0;wake();});
  reduced.addEventListener('change',()=>{time=reduced.matches?4:0;wake();});
  // Pointer movement updates unrelated root classes. Only an actual loading
  // transition should reset the clock; otherwise frequent pointer events starve RAF.
  const isLoading=()=>document.documentElement.matches('.is-page-loading, .is-transition-pending');
  let loading=isLoading();
  new MutationObserver(()=>{
    const next=isLoading();
    if(next===loading)return;
    loading=next;wake();
  }).observe(document.documentElement,{attributes:true,attributeFilter:['class']});
  resize();
})();
