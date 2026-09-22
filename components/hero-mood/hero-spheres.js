/* Glass image spheres: staggered drops, soft contacts, and page-entry reveal. */
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
  let sceneReady=!ctx;
  hero.classList.add('is-reveal-pending');
  const reveal = () => {
    if (!sceneReady || document.hidden || document.documentElement.matches('.is-page-loading, .is-transition-pending')) return;
    const lines = [];
    title.querySelectorAll('.hero-reveal-word').forEach(word => {
      if (!lines.includes(word.offsetTop)) lines.push(word.offsetTop);
      word.style.setProperty('--reveal-delay', `${lines.indexOf(word.offsetTop) * .18}s`);
    });
    hero.classList.remove('is-reveal-pending');
    hero.classList.add('is-revealing');
    observer.disconnect();
    if(ctx)wake();
  };
  const observer = new MutationObserver(reveal);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  reveal();
  // A restored page keeps completed CSS animations. Replay the copy alongside
  // the sphere reset, rather than showing old text over a new falling scene.
  const restartReveal=()=>{
    hero.classList.remove('is-revealing');
    hero.classList.add('is-reveal-pending');
    void hero.offsetWidth;
    observer.observe(document.documentElement,{attributes:true,attributeFilter:['class']});
    reveal();
  };
  addEventListener('pageshow',event=>{if(event.persisted)restartReveal();});
  document.addEventListener('visibilitychange',()=>{
    if(hero.classList.contains('is-reveal-pending'))reveal();
  });
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
  let anchors=[],bodies=[],copyGuard=null,frame=0,visible=true;
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
    const textBoxes=obstacles.slice(0,-1);
    copyGuard={left:Math.min(...textBoxes.map(box=>box.left)),right:Math.max(...textBoxes.map(box=>box.right)),
      top:Math.min(...textBoxes.map(box=>box.top)),bottom:Math.max(...textBoxes.map(box=>box.bottom))};
    const textLeft=obstacles.length>1?Math.min(...obstacles.slice(0,-1).map(box=>box.left)):w*.3;
    for(const p of anchors){
      const spread=((p.i*17+3)%23)/22;
      const left=p.r*.25+spread*Math.max(0,textLeft-p.r*1.25-24);
      p.side=(Math.floor(p.i/4)+p.i)%2;
      p.x=p.side?w-left:left;
      p.y=-p.r-30-(p.i%3)*22;
      p.delay=.15+((p.i*7)%count)*.095+(p.i%3)*.035;
    }
    resetBodies();
    wake();
  }
  function resetBodies(){
    time=0;last=0;
    bodies=anchors.map(p=>({...p,vx:(p.side?-1:1)*(8+(p.i%5)*5),vy:15+(p.i%4)*22,quiet:0,sleeping:false,supported:false,spawned:false}));
    if(reduced.matches)for(let i=0;i<1800;i++)advance(1/120);
  }
  function constrain(p){
    const floor=h-p.r-10;
    if(p.y>=floor){p.supported=true;p.y=floor;if(p.vy>0)p.vy=p.vy>25?-p.vy*.18:0;p.vx*=.96;}
    const left=-p.r*.30,right=w+p.r*.30;
    if(p.x<left){p.x=left;if(p.vx<0)p.vx*=-.15;}
    if(p.x>right){p.x=right;if(p.vx>0)p.vx*=-.15;}
    // A smooth side corridor guides falling spheres around the whole copy block.
    // There are no per-line shelves and no sideways jumps at a new text line.
    const smooth=value=>{const t=Math.max(0,Math.min(1,value));return t*t*(3-2*t);};
    const clearance=smooth((p.y+p.r-copyGuard.top+100)/100)*
      (1-smooth((p.y-p.r-copyGuard.bottom)/100));
    if(clearance>0){
      const wall=p.side?w*.54+(copyGuard.right+p.r+8-w*.54)*clearance:
        w*.46+(copyGuard.left-p.r-8-w*.46)*clearance;
      if(p.side&&p.x<wall){p.x=wall;p.vx=Math.max(0,p.vx);}
      if(!p.side&&p.x>wall){p.x=wall;p.vx=Math.min(0,p.vx);}
    }
  }
  function advance(dt){
    time+=dt;
    // Wait for a free release point: overlapping newborn bodies used to eject
    // their neighbours sideways before the first visible falling frame.
    for(const p of bodies){
      if(p.spawned||time<=p.delay)continue;
      if(bodies.some(q=>q.spawned&&Math.hypot(p.x-q.x,p.y-q.y)<p.r+q.r+10))continue;
      p.spawned=true;
    }
    const active=bodies.filter(p=>p.spawned);
    for(const p of active){
      p.previousX=p.x;p.previousY=p.y;
      if(p.sleeping)continue;
      p.supported=false;
      if(!p.cleared&&p.y-p.r>copyGuard.bottom+100){
        p.cleared=true;p.vx+=(p.side?-1:1)*30;
      }
      p.vy+=(w<600?520:650)*dt;
      p.vx*=Math.exp(-1.1*dt);
      p.x+=p.vx*dt;p.y+=p.vy*dt;
    }
    for(let pass=0;pass<20;pass++){
      active.filter(p=>!p.sleeping).forEach(constrain);
      for(let a=0;a<active.length;a++)for(let b=a+1;b<active.length;b++){
        const p=active[a],q=active[b],dx=q.x-p.x,dy=q.y-p.y;
        const distance=Math.hypot(dx,dy)||.001,gap=p.r+q.r+2;
        if(distance>=gap)continue;
        const nx=dx/distance,ny=dy/distance,penetration=gap-distance;
        const approach=(q.vx-p.vx)*nx+(q.vy-p.vy)*ny;
        if(approach<-35){p.sleeping=false;q.sleeping=false;p.quiet=0;q.quiet=0;}
        const ip=p.sleeping?0:1/(p.r*p.r),iq=q.sleeping?0:1/(q.r*q.r),sum=ip+iq;
        if(!sum)continue;
        if(ny>.35)p.supported=true;
        if(ny<-.35)q.supported=true;
        p.x-=nx*penetration*ip/sum;p.y-=ny*penetration*ip/sum;
        q.x+=nx*penetration*iq/sum;q.y+=ny*penetration*iq/sum;
        if(approach<0){
          const restitution=pass===0&&approach<-30?.20:0;
          const impulse=-(1+restitution)*approach/sum;
          p.vx-=impulse*nx*ip;p.vy-=impulse*ny*ip;
          q.vx+=impulse*nx*iq;q.vy+=impulse*ny*iq;
        }
      }
    }
    for(const p of active){
      if(p.sleeping)continue;
      const displacement=Math.hypot(p.x-p.previousX,p.y-p.previousY);
      p.quiet=p.supported&&displacement<.12&&Math.hypot(p.vx,p.vy)<12?p.quiet+dt:0;
      if(p.quiet>.45){p.sleeping=true;p.vx=0;p.vy=0;}
    }
  }
  function draw(now){
    const dt=!reduced.matches&&last?Math.max(0,Math.min((now-last)/1000,.05)):0;
    last=now;ctx.clearRect(0,0,w,h);
    const steps=Math.max(1,Math.ceil(dt*120));
    for(let step=0;step<steps;step++)if(dt)advance(dt/steps);
    const positions=bodies.filter(p=>p.spawned);
    // Small soft contact shadows strengthen as a sphere approaches the floor.
    for(const p of positions){
      const proximity=Math.max(0,1-(h-p.y-p.r)/(p.r*2));
      if(!proximity)continue;
      ctx.save();ctx.translate(p.x,h-7);ctx.scale(p.r*.9,p.r*.12);
      const shadow=ctx.createRadialGradient(0,0,0,0,0,1);
      shadow.addColorStop(0,`rgba(155,175,195,${proximity*.18})`);
      shadow.addColorStop(.5,`rgba(70,85,105,${proximity*.12})`);
      shadow.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=shadow;ctx.beginPath();ctx.arc(0,0,1,0,Math.PI*2);ctx.fill();ctx.restore();
    }
    for(const p of positions){
      ctx.save();ctx.translate(p.x,p.y);
      ctx.shadowColor='#00000090';ctx.shadowBlur=12;ctx.shadowOffsetY=7;
      ctx.drawImage(textures[p.i],-p.r,-p.r,p.r*2,p.r*2);ctx.restore();
    }
    canvas.dataset.sphereCount=String(anchors.length);
    frame=0;
    if(canAnimate())frame=requestAnimationFrame(draw);
  }
  function canAnimate() {
    return visible && !document.hidden && !reduced.matches && !hero.classList.contains('is-reveal-pending') &&
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
    visible=entry.isIntersecting;
    if(visible&&time>2){resetBodies();restartReveal();}
    wake();
  });
  visibilityObserver.observe(canvas);
  document.addEventListener('visibilitychange',wake);
  addEventListener('pageshow',()=>{resetBodies();wake();});
  reduced.addEventListener('change',()=>{resetBodies();wake();});
  // Pointer movement updates unrelated root classes. Only an actual loading
  // transition should reset the clock; otherwise frequent pointer events starve RAF.
  const isLoading=()=>document.documentElement.matches('.is-page-loading, .is-transition-pending');
  let loading=isLoading();
  new MutationObserver(()=>{
    const next=isLoading();
    if(next===loading)return;
    loading=next;wake();
  }).observe(document.documentElement,{attributes:true,attributeFilter:['class']});
  sceneReady=true;
  resize();
  reveal();
})();
