/* The safety gear, put on before the building game and before the car
   factory: a helmet, a vest, and two gloves. Before it, بِسْمِ اللَّهِ shows
   with a button to begin; the tap is also what lets the page speak. Then each
   piece is dragged from its peg onto the boy, as the seat belt is dragged in
   the driving games: let go near where it is worn and it goes on, anywhere
   else it slides back. The gloves are a right one and a left one, each for
   its own hand, and the right hand comes first: the left glove stays on its
   peg until the right one is on, and اِبْدَأْ بِالْيَمِينِ shows and is said.
   The boy faces us, so his right hand is on the left of the picture; his
   arms hang with the palms toward us, so each thumb is on the outer side,
   away from his body, on the bare hand and on its glove alike.
   A page gives this an empty <section id="view-gear">, shows that section,
   and calls gear.start(done); done() runs once everything is on. */
const gear = (() => {
  /* A left hand seen palm on, hanging down: the fingers point down and the
     thumb is on our right, the side away from the body. The right hand is
     its mirror image. The boy's bare hands and the gloves are this one
     shape, a glove a size larger with a seam and a cuff, so a glove covers
     its hand and the two thumbs always agree. Both are drawn large for the
     boy, so that the fingers and the thumbs show on a small screen. */
  const FINGERS = [[-16, 22], [-8, 27], [0, 29], [8, 26]]; // from the little finger to the one beside the thumb: where each starts, and its length
  const hand = (fill, glove) => `<rect x="8" y="-12" width="10" height="27" rx="5" transform="rotate(-38 13 -8)" fill="${fill}"/>`
    + FINGERS.map(([x, long]) => `<rect x="${x}" y="2" width="8" height="${long}" rx="4" fill="${fill}"/>`).join('')
    + `<path d="M-16 -18h32v24a4 4 0 0 1 -4 4h-24a4 4 0 0 1 -4 -4z" fill="${fill}"/>`
    + (glove ? '<path d="M-11 -8h20" fill="none" stroke-width="2.5" stroke-linecap="round" opacity=".45"/><rect x="-18" y="-31" width="36" height="14" rx="3" fill="#F2B84B"/>' : '');
  const GLOVE = hand('#8C6A4C', true);
  const HAND = `<g transform="scale(.95)" stroke-width="3">${hand('#E3B78E', false)}</g>`;
  const SCENE = `
    <p class="praise bismillah">بِسْمِ اللَّهِ</p>
    <button class="go" id="gear-go" type="button" aria-label="اِبْدَأْ"><svg viewBox="0 0 48 48" aria-hidden="true"><path d="M17 9L40 24L17 39z" fill="currentColor"/></svg></button>
    <p class="prompt" id="gear-prompt">اِلْبَسْ مُعَدَّاتِ السَّلَامَةِ</p>
    <p class="prompt gear-hint off" id="gear-hint">اِبْدَأْ بِالْيَمِينِ</p>
    <svg class="belt-scene gear-scene" id="gear" viewBox="0 0 400 400" role="img" tabindex="0" aria-label="مُعَدَّاتُ السَّلَامَةِ">
      <rect width="400" height="400" rx="28" fill="#E9DCC8"/>
      <path d="M0 322H400V372a28 28 0 0 1-28 28H28a28 28 0 0 1-28-28z" fill="#D3C2A8"/>
      <path d="M0 322H400" stroke="#4A3424" stroke-width="5"/>
      <rect x="8" y="20" width="144" height="326" rx="16" fill="#C9A77A" stroke="#4A3424" stroke-width="5"/>
      <g fill="#DDBF95"><circle cx="80" cy="70" r="42"/><circle cx="80" cy="166" r="42"/><rect x="12" y="250" width="136" height="88" rx="20"/></g>
      <g transform="translate(14 0)" stroke="#4A3424" stroke-width="5" stroke-linejoin="round">
        <ellipse cx="250" cy="346" rx="74" ry="9" fill="#C7B596" stroke="none"/>
        <ellipse cx="231" cy="338" rx="19" ry="10" fill="#6E533B"/>
        <ellipse cx="269" cy="338" rx="19" ry="10" fill="#6E533B"/>
        <path d="M222 258h26v76h-26zM252 258h26v76h-26z" fill="#2F4B7C"/>
        <path d="M216 166q-24 12-34 76h20q6-42 20-50zM284 166q24 12 34 76h-20q-6-42-20-50z" fill="#9CC7E8"/>
        <g transform="translate(192 259) scale(-1 1)">${HAND}</g>
        <g transform="translate(308 259)">${HAND}</g>
        <path d="M214 162q36-14 72 0l4 104h-80z" fill="#9CC7E8"/>
        <rect x="241" y="138" width="18" height="26" fill="#E3B78E"/>
        <circle cx="214" cy="116" r="7" fill="#E3B78E"/>
        <circle cx="286" cy="116" r="7" fill="#E3B78E"/>
        <circle cx="250" cy="112" r="36" fill="#E3B78E"/>
        <path d="M214.6 106A36 36 0 0 1 285.4 106Q270 88 250 93T214.6 106Z" fill="#4A3424"/>
      </g>
      <circle id="gear-glow" r="46" fill="none" stroke="#F2B84B" stroke-width="6" visibility="hidden"/>
      <g class="gear-item" data-gear="vest">
        <circle r="50" fill="transparent"/>
        <g class="gear-art" stroke="#4A3424" stroke-width="5" stroke-linejoin="round">
          <path d="M-37 -52h17q20 18 40 0h17l5 104h-84z" fill="#F2742B"/>
          <path d="M-41 14h82v13h-82z" fill="#F7E26B" stroke-width="3"/>
          <path d="M-27 -50h10v102h-10zM17 -50h10v102h-10z" fill="#F7E26B" stroke-width="3"/>
        </g>
      </g>
      <g class="gear-item" data-gear="glove-left">
        <circle r="26" fill="transparent"/>
        <g class="gear-art" stroke="#4A3424" stroke-width="2.8" stroke-linejoin="round"><g transform="scale(1.3)">${GLOVE}</g></g>
      </g>
      <g class="gear-item" data-gear="glove-right">
        <circle r="26" fill="transparent"/>
        <g class="gear-art" stroke="#4A3424" stroke-width="2.8" stroke-linejoin="round"><g transform="scale(-1.3 1.3)">${GLOVE}</g></g>
      </g>
      <g class="gear-item" data-gear="helmet">
        <circle r="50" fill="transparent"/>
        <g class="gear-art" stroke="#4A3424" stroke-width="5" stroke-linejoin="round">
          <path d="M-36 12a36 36 0 0 1 72 0z" fill="#F2B84B"/>
          <path d="M-7 -23h14v35h-14z" fill="#E9A43C" stroke-width="3"/>
          <rect x="-45" y="10" width="90" height="12" rx="6" fill="#E9A43C"/>
        </g>
      </g>
    </svg>`;
  /* Where each piece hangs, where it is worn, and the ring that shows when it is near. */
  const PIECES = {
    helmet: { home: [80, 70], worn: [264, 84], ring: [264, 92, 46] },
    vest: { home: [80, 166], worn: [264, 214], ring: [264, 214, 46] },
    'glove-right': { home: [54, 294], worn: [206, 259], ring: [206, 259, 44] },
    'glove-left': { home: [106, 294], worn: [322, 259], ring: [322, 259, 44] },
  };
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const on = new Set();
  const timers = {};
  let box = null;
  let done = null;
  let run = 0;
  let told = false; // the hint about the right hand has been said

  const item = (name) => box.querySelector(`[data-gear="${name}"]`);
  const place = (name, x, y) => item(name).setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
  const glow = (spec) => {
    const ring = box.querySelector('#gear-glow');
    ring.setAttribute('visibility', spec ? 'visible' : 'hidden');
    if (!spec) return;
    ring.setAttribute('cx', spec.ring[0]);
    ring.setAttribute('cy', spec.ring[1]);
    ring.setAttribute('r', spec.ring[2]);
  };
  const click = () => {
    if (typeof sound.click === 'function') sound.click();
  };

  /* The right hand first: shown, said once, and the right glove calls. */
  function rightFirst(again) {
    box.querySelector('#gear-hint').classList.remove('off');
    if (!told || again) sound.say('start-right');
    told = true;
  }

  function wear(name) {
    if (on.has(name) || !box) return;
    on.add(name);
    clearInterval(timers[name]);
    place(name, ...PIECES[name].worn);
    item(name).classList.add('worn');
    glow(null);
    click();
    box.classList.toggle('right-on', on.has('glove-right'));
    if (on.size < Object.keys(PIECES).length) return;
    const mine = run;
    setTimeout(() => {
      if (mine === run && done) done();
    }, 900);
  }

  function point(event) {
    const boxed = box.querySelector('#gear').getBoundingClientRect();
    return [((event.clientX - boxed.left) / boxed.width) * 400, ((event.clientY - boxed.top) / boxed.height) * 400];
  }

  function wire(name) {
    const piece = item(name);
    const spec = PIECES[name];
    let id = null;
    let at = spec.home;
    let near = false;
    piece.addEventListener('pointerdown', (event) => {
      if (on.has(name) || id !== null) return;
      event.preventDefault();
      if (name === 'glove-left' && !on.has('glove-right')) {
        // Not yet: it shakes on its peg, and the right glove is pointed out.
        rightFirst(true);
        piece.classList.remove('no');
        void piece.getBoundingClientRect();
        piece.classList.add('no');
        return;
      }
      if (name === 'glove-right') rightFirst(false);
      clearInterval(timers[name]);
      id = event.pointerId;
      piece.parentNode.append(piece); // on top while it is carried
      try {
        piece.setPointerCapture(event.pointerId);
      } catch {
        // The pointer is already gone.
      }
    });
    piece.addEventListener('pointermove', (event) => {
      if (event.pointerId !== id) return;
      const [x, y] = point(event);
      at = [Math.max(30, Math.min(370, x)), Math.max(30, Math.min(370, y))];
      place(name, ...at);
      near = Math.hypot(at[0] - spec.worn[0], at[1] - spec.worn[1]) < 60;
      glow(near ? spec : null);
    });
    for (const type of ['pointerup', 'pointercancel']) {
      piece.addEventListener(type, (event) => {
        if (event.pointerId !== id) return;
        id = null;
        if (near && type === 'pointerup') {
          wear(name);
          return;
        }
        glow(null);
        // Back to its peg.
        const from = at;
        let step = 0;
        timers[name] = setInterval(() => {
          step += 1;
          const part = 1 - (1 - step / 12) ** 2;
          at = [from[0] + (spec.home[0] - from[0]) * part, from[1] + (spec.home[1] - from[1]) * part];
          place(name, ...at);
          if (step >= 12) clearInterval(timers[name]);
        }, 16);
      });
    }
  }

  function build() {
    box = document.getElementById('view-gear');
    box.innerHTML = SCENE;
    /* The two lines are hidden, keeping their room, when their Egyptian
       recording is the one said (the father's rule, 2026-11-25): the pegs
       and the breathing glove show what to do. */
    if (typeof sound.caption === 'function') {
      sound.caption(box.querySelector('#gear-prompt'), 'اِلْبَسْ مُعَدَّاتِ السَّلَامَةِ', 'gear');
      sound.caption(box.querySelector('#gear-hint'), 'اِبْدَأْ بِالْيَمِينِ', 'start-right');
    }
    for (const name of Object.keys(PIECES)) wire(name);
    box.querySelector('#gear').addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      const next = Object.keys(PIECES).find((name) => !on.has(name));
      if (next) wear(next);
    });
    // The button says بِسْمِ اللَّهِ, then the gear comes.
    box.querySelector('#gear-go').addEventListener('click', async () => {
      const mine = run;
      box.dataset.step = 'saying';
      const began = performance.now();
      await Promise.race([sound.say('bismillah'), wait(4000)]);
      await wait(Math.max(0, 1300 - (performance.now() - began)));
      if (mine !== run) return;
      box.dataset.step = 'gear';
      sound.say('gear');
    });
  }

  /* Everything back on its pegs, and بِسْمِ اللَّهِ with its button. */
  function start(whenDone) {
    if (!box) build();
    run += 1;
    done = whenDone;
    told = false;
    on.clear();
    for (const name of Object.keys(PIECES)) {
      clearInterval(timers[name]);
      place(name, ...PIECES[name].home);
      item(name).classList.remove('worn', 'no');
    }
    glow(null);
    box.classList.remove('right-on');
    box.querySelector('#gear-hint').classList.add('off');
    box.dataset.step = 'begin';
  }

  /* Leaving: nothing more is to happen here. */
  function stop() {
    run += 1;
    done = null;
  }

  /* For trying things out: straight past the gear. */
  function skip() {
    const go = done;
    stop();
    if (go) go();
  }

  return { start, stop, wear, skip, pieces: Object.keys(PIECES) };
})();
