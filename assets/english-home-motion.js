/* V3: one-shot entrances and scroll-linked transforms. No loop or hidden base state. */
(() => {
  const home = document.querySelector('.english-home, .dutch-home');
  if (!home) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const desktop = matchMedia('(min-width: 1024px)');
  const stacked = matchMedia('(max-width: 768px)');
  const revealed = new WeakSet();
  let stop = () => {};
  const intro = home.querySelector('.hero-intro');
  const introPhone = intro?.querySelector('img');
  let introPlayed = reduced.matches;
  const startIntro = () => {
    if (introPlayed) return;
    introPlayed = true;
    if (!reduced.matches && scrollY < home.querySelector('.hero').offsetHeight * .5) intro.classList.add('is-entering');
  };
  if (introPhone) {
    if (introPhone.decode) introPhone.decode().then(startIntro).catch(() => {});
    else if (introPhone.complete) startIntro();
    else introPhone.addEventListener('load',startIntro,{once:true});
  }
  if (intro && !introPhone) startIntro();
  reduced.addEventListener('change',() => {
    if (reduced.matches) {introPlayed=true;intro?.classList.remove('is-entering');}
  });
  function configure() {
    stop();
    stop = () => {};
    if (reduced.matches || !('IntersectionObserver' in window)) return;
    const cleanups = [];
    const targets = [...home.querySelectorAll('.features-grid .feature-card, .pricing-grid > *, '+(stacked.matches ? '.story-visual, .story-copy' : '.story-row'))];
    const reveal = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        revealed.add(entry.target);
        if (entry.target.matches('.story-row')) entry.target.querySelectorAll('.story-visual,.story-copy').forEach(node=>revealed.add(node));
        else if (entry.target.closest('.story-row')) revealed.add(entry.target.closest('.story-row'));
        entry.target.classList.add('is-revealing');
        reveal.unobserve(entry.target);
      }
    }, {threshold:0.08});
    for (const target of targets) {
      if (revealed.has(target)) continue;
      const rect = target.getBoundingClientRect();
      if (rect.top < innerHeight && rect.bottom > 0) revealed.add(target);
      else reveal.observe(target);
    }
    cleanups.push(() => {reveal.disconnect();targets.forEach(target => target.classList.remove('is-revealing'));});
    if (desktop.matches) {
      const hero = home.querySelector('.hero');
      const phone = hero.querySelector('.hero-hover');
      const phoneTrack = hero.querySelector('.hero-parallax');
      const sections = [hero, home.querySelector('.story-section')].map(element => ({element,visible:false,top:0,height:1}));
      let frame = 0, limit = 0, viewport = innerHeight;
      const measure = () => {
        viewport = innerHeight;
        for (const section of sections) {section.top=section.element.getBoundingClientRect().top+scrollY;section.height=section.element.offsetHeight;}
        // Read the untransformed layout position, even during entrance/hover/scroll.
        let phoneTop = 0;
        for (let node = phoneTrack; node && node !== hero; node = node.offsetParent) phoneTop += node.offsetTop;
        // Keep the full composition and its shadow inside the hero, including
        // the maximum combined 1.04 scroll and 1.04 hover scale.
        limit = Math.max(0,hero.offsetHeight-phoneTop-phone.offsetHeight*1.0408-32);
      };
      const paint = () => {
        frame = 0;
        for (const section of sections) {
          if (!section.visible) continue;
          const depth = Math.min(1,Math.max(0,(scrollY+viewport-section.top)/(section.height+viewport)));
          section.element.style.setProperty('--depth-y',`${(depth-.5)*64}px`);
          if (section.element===hero) {
            const progress = Math.min(1,Math.max(0,(scrollY-section.top)/(section.height*.6)));
            // Compensate 65% of page movement: the phone travels at 35% speed.
            // Ease into the lower boundary with a continuous slope, never a hard stop.
            const distance = Math.max(0,scrollY-section.top)*.65;
            const easeRange = Math.min(96,limit*.4);
            const easeStart = limit-easeRange;
            const t = easeRange ? Math.min(1,Math.max(0,(distance-easeStart)/(2*easeRange))) : 0;
            const offset = distance <= easeStart ? distance : easeStart+easeRange*(2*t-t*t);
            hero.style.setProperty('--phone-y',`${Math.min(limit,offset)}px`);
            hero.style.setProperty('--phone-scale',`${1+progress*.04}`);
            // Fade smoothly as Everyday tools enters the reading area; no timer or clipping.
            const exit = Math.min(1,Math.max(0,(scrollY+viewport*.75-section.top-section.height)/(viewport*.28)));
            hero.style.setProperty('--phone-opacity',`${1-exit*exit*(3-2*exit)}`);
          }
        }
      };
      const schedule = () => {if (!frame&&sections.some(section=>section.visible)) frame=requestAnimationFrame(paint);};
      const resize = () => {measure();schedule();};
      const visibility = new IntersectionObserver(entries => {
        for (const entry of entries) sections.find(section=>section.element===entry.target).visible=entry.isIntersecting;
        schedule();
      },{rootMargin:'100px'});
      measure();sections.forEach(section=>visibility.observe(section.element));
      addEventListener('scroll',schedule,{passive:true});addEventListener('resize',resize,{passive:true});
      const size = new ResizeObserver(resize);sections.forEach(section=>size.observe(section.element));
      cleanups.push(() => {
        visibility.disconnect();size.disconnect();cancelAnimationFrame(frame);
        removeEventListener('scroll',schedule);removeEventListener('resize',resize);
        for (const section of sections) section.element.style.removeProperty('--depth-y');
        for (const name of ['--phone-y','--phone-scale','--phone-opacity']) hero.style.removeProperty(name);
      });
    }
    stop=()=>cleanups.forEach(cleanup=>cleanup());
  }
  reduced.addEventListener('change',configure);desktop.addEventListener('change',configure);stacked.addEventListener('change',configure);configure();
})();
