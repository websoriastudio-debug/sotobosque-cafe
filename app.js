/* Sotobosque — interacciones y animaciones. Sin dependencias. */
(() => {
  'use strict';

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const seg = (v, a, b) => clamp((v - a) / (b - a));
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  const easeIn = t => t * t * t;
  const easeInOut = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const ancho = matchMedia('(min-width: 901px)');
  const IMG = 'https://images.unsplash.com/';

  /* ---------- Tareas ligadas al desplazamiento ---------- */
  const tareas = [];
  let pendiente = false;
  const alDesplazar = () => {
    if (pendiente) return;
    pendiente = true;
    requestAnimationFrame(() => {
      pendiente = false;
      const vh = innerHeight;
      tareas.forEach(t => t(vh));
    });
  };
  addEventListener('scroll', alDesplazar, { passive: true });
  addEventListener('resize', alDesplazar);

  /* ---------- Navegación ---------- */
  const nav = $('[data-nav]');
  tareas.push(() => nav.classList.toggle('es-solida', scrollY > 48));

  const enlaces = $$('.nav-links a');
  const secciones = enlaces.map(a => $(a.getAttribute('href')));
  tareas.push(vh => {
    let actual = -1;
    secciones.forEach((s, i) => { if (s.getBoundingClientRect().top < vh * .45) actual = i; });
    enlaces.forEach((a, i) => {
      if (i === actual) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
    });
  });

  /* Menú móvil */
  const menuBtn = $('[data-menu-btn]');
  const menu = $('[data-menu]');
  const menuLabel = $('[data-menu-label]');
  let cierreTimer;
  const abrirMenu = abrir => {
    clearTimeout(cierreTimer);
    menuBtn.setAttribute('aria-expanded', String(abrir));
    menuLabel.textContent = abrir ? 'Cerrar' : 'Menú';
    document.documentElement.classList.toggle('menu-abierto', abrir);
    if (abrir) {
      menu.hidden = false;
      void menu.offsetWidth;
      menu.classList.add('abierto');
    } else {
      menu.classList.remove('abierto');
      cierreTimer = setTimeout(() => { menu.hidden = true; }, reduce.matches ? 0 : 560);
    }
  };
  menuBtn.addEventListener('click', () => abrirMenu(menuBtn.getAttribute('aria-expanded') !== 'true'));
  menu.addEventListener('click', e => { if (e.target.closest('a')) abrirMenu(false); });
  addEventListener('keydown', e => {
    if (menuBtn.getAttribute('aria-expanded') !== 'true') return;
    if (e.key === 'Escape') { abrirMenu(false); menuBtn.focus(); return; }
    if (e.key !== 'Tab') return;
    // El foco circula entre el botón y los enlaces del menú
    const foco = [menuBtn, ...$$('a', menu)];
    const i = foco.indexOf(document.activeElement);
    if (e.shiftKey && i <= 0) { e.preventDefault(); foco[foco.length - 1].focus(); }
    else if (!e.shiftKey && (i === foco.length - 1 || i === -1)) { e.preventDefault(); foco[0].focus(); }
  });
  ancho.addEventListener('change', e => { if (e.matches) abrirMenu(false); });

  /* ---------- Portada: capas ligadas al scroll ---------- */
  const hero = $('[data-hero]');
  tareas.push(() => {
    if (reduce.matches) return;
    const p = clamp(scrollY / hero.offsetHeight);
    hero.style.setProperty('--p', p.toFixed(4));
  });

  /* ---------- Manifiesto: las palabras se encienden al avanzar ---------- */
  const manifiesto = $('[data-palabras]');
  if (manifiesto && !reduce.matches) {
    const texto = manifiesto.textContent.trim();
    manifiesto.setAttribute('aria-label', texto);
    manifiesto.innerHTML = texto.split(/\s+/).map(w => `<span class="pal" aria-hidden="true">${w}</span>`).join(' ');
    const pals = $$('.pal', manifiesto);
    tareas.push(vh => {
      const r = manifiesto.getBoundingClientRect();
      const p = seg(vh * .88 - r.top, 0, r.height + vh * .38);
      const n = Math.round(p * pals.length);
      pals.forEach((el, i) => el.classList.toggle('lit', i < n));
    });
  }

  /* ---------- Propuesta: escena por capas ligada al scroll ---------- */
  const escena = $('[data-escena]');
  if (escena) (() => {
    const fija = $('.escena-fija', escena);
    const capa = n => $(`[data-capa="${n}"]`, escena);
    const rama = capa('rama'), brasa = capa('brasa'), heroe = capa('heroe'), temp = capa('temp');
    const filtro = capa('filtro'), polvo = capa('polvo'), taza = capa('taza');
    const tostado = $('[data-tostado]', heroe), vapor = $('.esc-vapor', taza);
    const nivel = $('[data-nivel]', taza), crema = $('[data-crema]', taza);
    const hojas = $$('[data-hoja]', escena);
    const textos = $$('[data-textos] li', escena), marcas = $$('[data-marcas] li', escena);
    const atm = $$('.esc-atm', escena), luzVerde = $('.luz-verde', escena), luzAmbar = $('.luz-ambar', escena), haz = $('.esc-haz', escena);
    const pctx = polvo.getContext('2d');
    const rnd = (s => () => { s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; })(21);

    // Granos tostados en tres planos: fondo, medio y primer plano
    const cont = $('[data-granos]', escena);
    const GRANOS = Array.from({ length: 18 }, (_, i) => {
      const el = document.createElement('span');
      el.innerHTML = '<svg viewBox="0 0 60 84"><use href="#grano"/></svg>';
      cont.appendChild(el);
      return { el, i, z: i < 6 ? 0 : i < 14 ? 1 : 2, r: Array.from({ length: 6 }, rnd), lado: i % 2 ? 1 : -1 };
    });
    const POLVO = Array.from({ length: 210 }, () => ({ src: Math.floor(rnd() * 9), r: Array.from({ length: 6 }, rnd) }));

    const L = {};
    const medir = () => {
      const W = fija.clientWidth, H = fija.clientHeight, esc = W > 900;
      Object.assign(L, {
        W, H, esc,
        cx: esc ? W * .66 : W * .5,
        u: esc ? Math.min(H, W * .6) : Math.min(H * .72, W * 1.2),
        yR: esc ? H * .5 : H * .4, yC: esc ? H * .47 : H * .38,
        yF: esc ? H * .27 : H * .22, yT: esc ? H * .7 : H * .54, yFin: esc ? H * .53 : H * .42
      });
      const { u, cx, yC } = L;
      const tam = (el, w, h) => { el.style.width = `${w}px`; el.style.height = `${h}px`; el._w = w; el._h = h; };
      tam(rama, u * .56, u * .7); tam(brasa, u * .66, u * .66); tam(heroe, u * .15, u * .21);
      tam(temp, u * .5, u * .06); tam(filtro, u * .34, u * .34); tam(taza, u * .32, u * .32 * 260 / 300);
      [[.36, .3], [.44, .37], [.24, .2]].forEach(([w, h], k) => tam(hojas[k], u * w, u * h));
      const esquinas = [[.07, .2], [.94, .15], [.3, .92], [.88, .88]];
      GRANOS.forEach(g => {
        if (g.z === 0) { g.x = W * (.05 + g.r[0] * .9); g.y = H * (.1 + g.r[1] * .8); g.t = u * (.026 + g.r[2] * .02); g.b = 2.2; g.a = .5; }
        else if (g.z === 1) {
          const ang = (g.i - 6) * Math.PI / 4 + g.r[0] * .5, rad = u * (.2 + g.r[1] * .2);
          g.x = cx + Math.cos(ang) * rad * 1.12; g.y = yC + Math.sin(ang) * rad * .86; g.t = u * (.05 + g.r[2] * .035); g.b = 0; g.a = 1;
        } else { const [ex, ey] = esquinas[g.i - 14]; g.x = W * ex; g.y = H * ey; g.t = u * (.11 + g.r[2] * .05); g.b = 4.5; g.a = .85; }
        g.rot = g.r[3] * 360; g.giro = (g.r[4] - .5) * 220; g.llega = .4 + g.r[5] * .1;
        tam(g.el, g.t, g.t * 1.4);
        g.el.style.filter = g.b ? `blur(${g.b}px)` : '';
      });
      const dpr = Math.min(devicePixelRatio || 1, 1.5);
      polvo.width = Math.round(W * dpr); polvo.height = Math.round(H * dpr);
      pctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const pon = (el, x, y, s = 1, r = 0, o = 1, b) => {
      el.style.transform = `translate3d(${(x - el._w / 2).toFixed(1)}px,${(y - el._h / 2).toFixed(1)}px,0) rotate(${r.toFixed(2)}deg) scale(${s.toFixed(3)})`;
      el.style.opacity = o.toFixed(3);
      if (b !== undefined) el.style.filter = b > .3 ? `blur(${b.toFixed(1)}px)` : 'none';
    };

    const cuadro = (p, pre, t) => {
      const { W, H, u, cx, yR, yC, yF, yT, yFin } = L;
      const embudo = { x: cx, y: yF - u * .07 };

      // Fondo: luces y fotografías desenfocadas que cambian con el recorrido
      const calor = seg(p, .3, .4) * (1 - seg(p, .54, .66));
      atm[0].style.opacity = (pre * (1 - seg(p, .2, .34)) * .42).toFixed(3);
      atm[1].style.opacity = (seg(p, .3, .42) * (1 - seg(p, .58, .7)) * .36).toFixed(3);
      atm[2].style.opacity = (seg(p, .6, .76) * .3).toFixed(3);
      atm.forEach((im, k) => { im.style.transform = `translate3d(0,${(-p * 5 * (k + 1)).toFixed(2)}%,0) scale(${(1.04 + p * .08).toFixed(3)})`; });
      luzVerde.style.opacity = ((1 - seg(p, .2, .36)) * .85).toFixed(3);
      luzAmbar.style.opacity = (.22 + calor * .6 + seg(p, .7, .95) * .25).toFixed(3);
      haz.style.transform = `translate3d(${(-p * 9).toFixed(2)}%,0,0) rotate(${(16 + p * 9).toFixed(2)}deg)`;

      // 1. La rama entra desde el fondo y se retira
      const e = easeOut(pre), sale = easeInOut(seg(p, .23, .34));
      pon(rama, cx - sale * W * .07, yR + (1 - e) * H * .06 - seg(p, .04, .24) * H * .02,
        lerp(1.32, 1, e) * lerp(1, .8, sale), lerp(-4, 0, e) - sale * 5, e * (1 - sale), (1 - e) * 16 + sale * 12);
      const hojaPos = [[-.44, -.3, -28], [.42, .3, 152], [.3, -.44, 38]];
      hojas.forEach((h, k) => {
        const [dx, dy, rot] = hojaPos[k];
        pon(h, cx + dx * u * (1 + (1 - e) * .35), yR + dy * u * (1 + (1 - e) * .35) - seg(p, 0, .32) * H * .09 * (k + 1),
          1 + (1 - e) * .3, rot + p * 40 * (k % 2 ? 1 : -1), e * (1 - seg(p, .2, .32)) * .6);
      });

      // 2. Un grano verde sale de la rama, se tuesta y cambia de color
      const va = easeInOut(seg(p, .2, .32)), junta = easeIn(seg(p, .6, .7));
      pon(brasa, cx, yC, .8 + calor * .3 + Math.sin(t * 3) * .015, 0, calor * .9);
      pon(heroe, lerp(lerp(cx - u * .07, cx, va), embudo.x, junta), lerp(lerp(yR - u * .05, yC, va), embudo.y, junta),
        lerp(.45, 1, va) * (1 + calor * .06) * lerp(1, .2, junta), -25 + easeInOut(seg(p, .3, .5)) * 200, seg(p, .17, .21) * (1 - seg(junta, .5, 1)));
      tostado.style.opacity = seg(p, .34, .46).toFixed(3);
      const to = seg(p, .34, .38) * (1 - seg(p, .5, .55));
      if (to > 0) temp.textContent = `${Math.round(lerp(24, 205, seg(p, .34, .46)))} °C`;
      pon(temp, cx, yC + u * .2, 1, 0, to);

      // 3. Granos tostados: cada uno llega por su lado y luego se reúnen sobre el filtro
      GRANOS.forEach(g => {
        const llega = easeOut(seg(p, g.llega, g.llega + .13));
        const kj = easeIn(seg(p, .585 + g.r[0] * .03, .7));
        const x0 = lerp(g.x + g.lado * (W * .55 + g.t * 3), g.x, llega);
        const y0 = lerp(g.y - H * .18 * g.r[1], g.y, llega) - seg(p, g.llega + .13, .7) * H * .045 * (g.z + 1);
        pon(g.el, lerp(x0, embudo.x, kj), lerp(y0, embudo.y, kj), lerp(1, .18, kj),
          g.rot + (1 - llega) * g.lado * -260 + p * g.giro, seg(llega, 0, .25) * g.a * (1 - seg(kj, .55, 1)));
      });

      // 4. Molienda (partículas) y chorro de extracción
      pctx.clearRect(0, 0, W, H);
      if (p > .58 && p < .93) {
        const medios = GRANOS.filter(g => g.z === 1);
        for (const m of POLVO) {
          const d = m.r[0];
          const ti = easeInOut(seg(p, .6 + d * .05, .7 + d * .04));
          const a = seg(p, .595 + d * .05, .615 + d * .05) * (1 - seg(ti, .86, 1));
          if (a <= 0) continue;
          const f = m.src < 8 ? medios[m.src] : { x: cx, y: yC };
          const sx = f.x + (m.r[1] - .5) * u * .09, sy = f.y + (m.r[2] - .5) * u * .09;
          const tx = embudo.x + (m.r[3] - .5) * u * .08, ty = embudo.y;
          const qx = (sx + tx) / 2 + (m.r[4] - .5) * u * .42, qy = Math.min(sy, ty) - u * .14;
          const k = 1 - ti;
          const x = k * k * sx + 2 * k * ti * qx + ti * ti * tx, y = k * k * sy + 2 * k * ti * qy + ti * ti * ty;
          const tono = Math.round(lerp(64, 128, m.r[5]));
          pctx.fillStyle = `rgba(${tono},${Math.round(tono * .58)},${Math.round(tono * .32)},${a.toFixed(3)})`;
          pctx.beginPath(); pctx.arc(x, y, u * (.0016 + m.r[5] * .0028), 0, 6.283); pctx.fill();
        }
      }

      const llegaFiltro = easeOut(seg(p, .55, .67)), fin = easeInOut(seg(p, .9, .98));
      pon(filtro, cx, yF - fin * H * .1, lerp(1.3, 1, llegaFiltro) * lerp(1, .9, fin), 0, llegaFiltro * (1 - fin), (1 - llegaFiltro) * 14 + fin * 8);

      // 5. La taza se llena y, al final, sube al centro con vapor
      const c = easeOut(seg(p, .62, .74)), lleno = seg(p, .735, .9);
      const ty = lerp(yT + (1 - c) * H * .1, yFin, fin), ts = lerp(.86, 1, c) * lerp(1, 1.24, fin);
      pon(taza, cx, ty, ts, 0, c, (1 - c) * 8);
      const ny = lerp(214, 80, lleno);
      nivel.setAttribute('y', ny.toFixed(1)); nivel.setAttribute('height', (222 - ny).toFixed(1));
      crema.setAttribute('cy', ny.toFixed(1)); crema.setAttribute('rx', (lerp(98, 82, (ny - 40) / 176) - 3).toFixed(1));
      crema.setAttribute('opacity', seg(lleno, .03, .14).toFixed(2));
      vapor.style.opacity = seg(p, .93, .99).toFixed(3);
      taza.classList.toggle('humea', p > .92);

      const chorro = seg(p, .71, .745) * (1 - seg(p, .885, .91));
      if (chorro > 0) {
        const y1 = yF + u * .15, y2 = ty - taza._h * ts / 2 + (ny / 260) * taza._h * ts;
        const yFinal = lerp(y1, y2, seg(p, .71, .745));
        const g = pctx.createLinearGradient(cx - 4, 0, cx + 4, 0);
        g.addColorStop(0, `rgba(58,26,10,${chorro})`); g.addColorStop(.5, `rgba(176,104,46,${chorro})`); g.addColorStop(1, `rgba(70,32,12,${chorro})`);
        pctx.strokeStyle = g; pctx.lineWidth = Math.max(3, u * .011); pctx.lineCap = 'round';
        pctx.beginPath(); pctx.moveTo(cx, y1);
        for (let y = y1; y <= yFinal; y += 12) pctx.lineTo(cx + Math.sin(y * .05 - t * 9) * 1.4, y);
        pctx.lineTo(cx + Math.sin(yFinal * .05 - t * 9) * 1.4, yFinal); pctx.stroke();
        if (yFinal >= y2 - 1) {
          pctx.strokeStyle = `rgba(214,150,84,${chorro * .7})`; pctx.lineWidth = 1.5;
          const onda = (t * 1.6) % 1;
          pctx.beginPath(); pctx.ellipse(cx, y2 + 1, u * .012 + onda * u * .05, 2 + onda * 3, 0, 0, 6.283); pctx.stroke();
        }
      }

      // Textos y marcas de capítulo
      const vis = [
        [seg(pre, .5, 1), seg(p, .21, .26)], [seg(p, .3, .35), seg(p, .53, .58)],
        [seg(p, .61, .66), seg(p, .86, .9)], [seg(p, .93, .98), 0]
      ];
      textos.forEach((li, k) => {
        const [entra, sale2] = vis[k], o = easeOut(entra) * (1 - sale2);
        li.style.opacity = o.toFixed(3);
        li.style.setProperty('--dy', `${((1 - easeOut(entra)) * 34 - sale2 * 34).toFixed(1)}px`);
        li.classList.toggle('vis', o > .02);
      });
      const cap = p < .28 ? 0 : p < .6 ? 1 : 2;
      [seg(p, 0, .28), seg(p, .28, .6), seg(p, .6, .92)].forEach((f, k) => {
        marcas[k].classList.toggle('act', k === cap);
        marcas[k].firstElementChild.nextElementSibling.style.setProperty('--f', f.toFixed(3));
      });
    };

    let obj = 0, act = 0, preObj = 0, preAct = 0, visible = false, raf = 0;
    const paso = ms => {
      raf = 0;
      act += (obj - act) * .12; preAct += (preObj - preAct) * .12;
      if (Math.abs(obj - act) < .0005) act = obj;
      cuadro(act, preAct, ms / 1000);
      if (visible) raf = requestAnimationFrame(paso);
    };
    tareas.push(vh => {
      if (!escena.classList.contains('activa')) return;
      const r = escena.getBoundingClientRect();
      preObj = seg(vh * .75 - r.top, 0, vh * .75);
      obj = clamp(clamp(-r.top / (escena.offsetHeight - vh)) * 1.06);
    });
    const activar = () => {
      const on = !reduce.matches;
      escena.classList.toggle('activa', on);
      if (on) { medir(); alDesplazar(); if (visible && !raf) raf = requestAnimationFrame(paso); }
      else { cancelAnimationFrame(raf); raf = 0; textos.forEach(li => { li.style.opacity = ''; li.classList.remove('vis'); }); }
    };
    new IntersectionObserver(([en]) => {
      visible = en.isIntersecting;
      if (visible && !raf && escena.classList.contains('activa')) raf = requestAnimationFrame(paso);
    }, { rootMargin: '20% 0px' }).observe(escena);
    new ResizeObserver(() => { if (escena.classList.contains('activa')) { medir(); if (!raf) cuadro(act, preAct, 0); } }).observe(fija);
    reduce.addEventListener('change', activar);
    activar();
  })();

  /* ---------- Carta: categorías, productos y destacado ---------- */
  const CARTA = {
    caliente: [
      ['Espresso', '2.50', 'Corto y denso, con notas de cacao.', 'photo-1736813132132-7cd457c12ea6'],
      ['Capuchino', '3.80', 'Espuma espesa y cacao rallado.', 'photo-1593705058194-103225c2b64b'],
      ['Flat white', '3.80', 'Más café que leche, microespuma fina.', 'photo-1763473821509-9a383b480844'],
      ['Filtrado en V60', '4.50', 'El origen de la semana, en barra lenta.', 'photo-1759259639356-7c6e74eed1ec']
    ],
    frio: [
      ['Cold brew de 18 horas', '4.20', 'Infusionado en frío. Suave, sin acidez.', 'photo-1781663904565-cfdf6a21a9d9'],
      ['Latte helado', '4.50', 'Leche fría, hielo y espresso al final.', 'photo-1517701550927-30cf4ba1dba5'],
      ['Cold brew con leche', '4.60', 'Un chorro de leche fresca sobre el hielo.', 'photo-1562447457-579fc34967fb'],
      ['Affogato', '5.00', 'Helado de vainilla, bañado al momento.', 'photo-1481391032119-d89fee407e44']
    ],
    sincafe: [
      ['Matcha latte', '4.80', 'Batido a mano, con leche vaporizada.', 'photo-1763356844658-0374b285e8d1'],
      ['Chocolate espeso', '4.00', 'Cacao al 70 % y una pizca de sal.', 'photo-1542990253-0d0f5be5f0ed'],
      ['Chai de la casa', '4.20', 'Té negro, cardamomo, canela y anís.', 'photo-1636920272028-c27f1ae474c3'],
      ['Infusión de cáscara', '3.50', 'La pulpa seca de la cereza del café.', 'photo-1628702773947-1bcd12856811']
    ],
    horno: [
      ['Croissant de mantequilla', '3.20', 'Hojaldre de tres días, muy crujiente.', 'photo-1623334044303-241021148842'],
      ['Pan de banano y nuez', '3.50', 'Rebanada gruesa, tostada si lo pides.', 'photo-1767065887475-e7c38fa44ee9'],
      ['Galleta de cacao', '2.50', 'Grande y blanda en el centro.', 'photo-1613703154528-fa47dd7ffcfd'],
      ['Tarta de queso al horno', '5.00', 'Cremosa, con el borde caramelizado.', 'photo-1635327173758-85badf17f995']
    ]
  };

  const carta = $('[data-carta]');
  const tabs = $$('[data-tabs] [role="tab"]');
  const ind = $('[data-ind]');
  const panel = $('[data-panel]');
  const lista = $('[data-lista]');
  const plato = $('[data-plato]');
  const dNombre = $('[data-dnombre]'), dDesc = $('[data-ddesc]'), dPrecio = $('[data-dprecio]');
  const dInfo = dNombre.parentElement;
  const foto = (id, px) => `${IMG}${id}?auto=format&fit=crop&w=${px}&h=${px}&q=70`;
  const GIRO = 4600;
  let catActual = 'caliente', prodActual = -1, autoTimer = 0, autoActivo = !reduce.matches, cartaVisible = false;

  const reanimar = (el, clase) => { el.classList.remove(clase); void el.offsetWidth; el.classList.add(clase); };

  const elegirProd = (i, auto = false) => {
    const [nombre, precio, desc, id] = CARTA[catActual][i];
    prodActual = i;
    $$('.prod', lista).forEach((b, k) => {
      b.setAttribute('aria-pressed', String(k === i));
      b.classList.toggle('auto', auto && autoActivo);
    });
    $$('img', plato).forEach(v => { v.classList.remove('entra'); v.classList.add('sale'); setTimeout(() => v.remove(), 750); });
    const img = new Image();
    img.alt = ''; img.decoding = 'async'; img.className = 'entra';
    img.src = foto(id, 900);
    plato.appendChild(img);
    dNombre.textContent = nombre; dDesc.textContent = desc; dPrecio.textContent = `$${precio}`;
    reanimar(dInfo, 'cambia'); reanimar(dPrecio, 'cambia');
  };

  const programar = () => {
    clearTimeout(autoTimer);
    if (!autoActivo || !cartaVisible) return;
    autoTimer = setTimeout(() => {
      elegirProd((prodActual + 1) % CARTA[catActual].length, true);
      programar();
    }, GIRO);
  };

  const pintarCarta = cat => {
    catActual = cat;
    lista.innerHTML = CARTA[cat].map(([nombre, precio, desc, id], i) => `
      <li style="--n:${i}">
        <button class="prod" type="button" aria-pressed="false" data-prod="${i}">
          <img src="${foto(id, 160)}" width="160" height="160" alt="" loading="lazy" decoding="async">
          <span><span class="prod-nombre">${nombre}</span><span class="prod-desc">${desc}</span></span>
          <span class="prod-precio">$${precio}</span>
        </button>
      </li>`).join('');
    elegirProd(0, true);
    programar();
  };

  const moverInd = () => {
    const t = tabs.find(b => b.getAttribute('aria-selected') === 'true');
    ind.style.width = `${t.offsetWidth}px`;
    ind.style.transform = `translateX(${t.offsetLeft}px)`;
  };

  const elegirTab = (tab, foco = false) => {
    tabs.forEach(t => {
      const activo = t === tab;
      t.setAttribute('aria-selected', String(activo));
      t.tabIndex = activo ? 0 : -1;
    });
    panel.setAttribute('aria-labelledby', tab.id);
    moverInd();
    pintarCarta(tab.dataset.cat);
    if (foco) tab.focus();
    tab.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  };
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => elegirTab(tab));
    tab.addEventListener('keydown', e => {
      const mov = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
      let destino = null;
      if (mov) destino = tabs[(i + mov + tabs.length) % tabs.length];
      if (e.key === 'Home') destino = tabs[0];
      if (e.key === 'End') destino = tabs[tabs.length - 1];
      if (destino) { e.preventDefault(); elegirTab(destino, true); }
    });
  });

  // Al elegir un producto a mano, la rotación automática se detiene
  lista.addEventListener('click', e => {
    const b = e.target.closest('.prod');
    if (!b) return;
    autoActivo = false; clearTimeout(autoTimer);
    if (Number(b.dataset.prod) !== prodActual) elegirProd(Number(b.dataset.prod));
    else $$('.prod', lista).forEach(v => v.classList.remove('auto'));
  });
  carta.style.setProperty('--giro', `${GIRO}ms`);

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([en]) => {
      cartaVisible = en.isIntersecting;
      if (cartaVisible && autoActivo) { elegirProd(prodActual, true); programar(); } else clearTimeout(autoTimer);
    }, { threshold: .35 }).observe(carta);
  }
  tareas.push(vh => {
    if (reduce.matches) return;
    const r = carta.getBoundingClientRect();
    if (r.bottom < 0 || r.top > vh) return;
    carta.style.setProperty('--cp', seg(vh - r.top, 0, vh + r.height).toFixed(4));
  });
  addEventListener('resize', moverInd);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(moverInd);
  pintarCarta('caliente');
  moverInd();

  /* ---------- Del grano a la taza: escena dibujada en canvas ---------- */
  const proceso = $('[data-proceso]');
  const lienzo = $('[data-lienzo]');
  const ctx = lienzo.getContext('2d');
  const pasos = $$('[data-pasos] li');
  const rutaBtns = $$('[data-ir]');
  const rutaFill = $('[data-ruta-fill]');
  const RECORRIDO = 4.12; // un poco más de 4 para sostener la taza final

  const CREMA = '239,230,208';
  const mezcla = (a, b, t) => a.map((v, i) => Math.round(lerp(v, b[i], t)));
  const rgb = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  const VERDE = [169, 176, 137], CANELA = [198, 146, 80], CASTANO = [72, 39, 20];

  // Partículas de la molienda: posiciones fijas para que el recorrido sea reversible
  const azar = (s => () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; })(7);
  const semiAncho = y => lerp(112, 22, (y - 195) / 123) - 10;
  const granos = Array.from({ length: 170 }, () => {
    const a = azar() * Math.PI * 2, rr = Math.sqrt(azar());
    const ox = Math.cos(a) * rr * 58, oy = Math.sin(a) * rr * 84;
    const ang = Math.atan2(oy, ox) + (azar() - .5) * .9, dist = 40 + azar() * 190;
    const ty = 240 + Math.pow(azar(), .8) * 70;
    return {
      ox, oy, bx: Math.cos(ang) * dist, by: Math.sin(ang) * dist * .85,
      tx: 300 + (azar() * 2 - 1) * semiAncho(ty), ty,
      r: 1.6 + azar() * 3, tono: azar(), espera: azar() * .5
    };
  });

  const trazoTaza = () => {
    ctx.beginPath();
    ctx.moveTo(222, 418); ctx.lineTo(222, 474);
    ctx.quadraticCurveTo(222, 520, 268, 520); ctx.lineTo(332, 520);
    ctx.quadraticCurveTo(378, 520, 378, 474); ctx.lineTo(378, 418);
    ctx.closePath();
  };

  const dibujarGrano = (cx, cy, rx, ry, giro, color, alfa) => {
    ctx.save();
    ctx.globalAlpha = alfa;
    ctx.translate(cx, cy); ctx.rotate(giro);
    const g = ctx.createRadialGradient(-rx * .35, -ry * .4, rx * .1, 0, 0, ry * 1.05);
    g.addColorStop(0, rgb(mezcla(color, [255, 240, 210], .28)));
    g.addColorStop(.6, rgb(color));
    g.addColorStop(1, rgb(mezcla(color, [20, 10, 4], .45)));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = rgb(mezcla(color, [20, 10, 4], .62));
    ctx.lineWidth = rx * .17; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(2, -ry * .9);
    ctx.bezierCurveTo(-rx * .62, -ry * .3, rx * .62, ry * .3, -2, ry * .9); ctx.stroke();
    ctx.restore();
  };

  const dibujarCereza = alfa => {
    ctx.save();
    ctx.globalAlpha = alfa;
    ctx.strokeStyle = '#7a5632'; ctx.lineWidth = 7; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(302, 200); ctx.quadraticCurveTo(300, 150, 338, 118); ctx.stroke();
    ctx.fillStyle = '#3f7a55';
    ctx.beginPath(); ctx.moveTo(336, 120);
    ctx.bezierCurveTo(360, 70, 430, 62, 462, 84);
    ctx.bezierCurveTo(440, 126, 380, 140, 336, 120); ctx.fill();
    ctx.strokeStyle = 'rgba(20,48,31,.55)'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(340, 118); ctx.quadraticCurveTo(400, 92, 456, 86); ctx.stroke();
    const g = ctx.createRadialGradient(268, 248, 8, 300, 285, 96);
    g.addColorStop(0, '#ec6a55'); g.addColorStop(.55, '#b23a2c'); g.addColorStop(1, '#6f1b17');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(300, 285, 88, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,236,220,.32)';
    ctx.beginPath(); ctx.ellipse(266, 246, 13, 26, .7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(60,12,10,.5)';
    ctx.beginPath(); ctx.ellipse(302, 203, 10, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  };

  const dibujar = (p, t) => {
    const c2b = easeInOut(seg(p, .2, .62));
    const tueste = seg(p, .7, 1.4);
    const rotura = seg(p, 1.58, 2.1);
    const entraCono = easeOut(seg(p, 1.9, 2.4));
    const asienta = seg(p, 2.2, 2.8);
    const goteo = seg(p, 2.8, 3.55);
    const sale = seg(p, 3.55, 3.92);
    const conoY = (1 - entraCono) * -50 - easeIn(sale) * 330;
    const conoA = entraCono * (1 - sale);

    ctx.clearRect(0, 0, 600, 600);

    // Halo cálido de fondo
    const halo = ctx.createRadialGradient(300, 300, 20, 300, 300, 290);
    halo.addColorStop(0, 'rgba(201,168,118,.16)'); halo.addColorStop(1, 'rgba(201,168,118,0)');
    ctx.fillStyle = halo; ctx.fillRect(0, 0, 600, 600);

    // 1. Cereza que deja ver el grano
    if (c2b < 1) {
      ctx.save();
      ctx.translate(300, 285); ctx.scale(1 - c2b * .2, 1 - c2b * .2); ctx.translate(-300, -285);
      dibujarCereza(1 - c2b);
      ctx.restore();
    }

    // 2. Grano: de verde a castaño mientras gira en el tambor
    const granoA = c2b * (1 - seg(rotura, 0, .16));
    if (granoA > 0) {
      const color = tueste < .5 ? mezcla(VERDE, CANELA, tueste * 2) : mezcla(CANELA, CASTANO, (tueste - .5) * 2);
      const calor = seg(p, .66, .82) * (1 - seg(p, 1.42, 1.56));
      if (calor > 0) {
        ctx.save();
        ctx.lineCap = 'round'; ctx.lineWidth = 3;
        for (let k = 0; k < 3; k++) {
          const r = 128 + k * 22, ini = t * (.9 - k * .22) + k * 2.1;
          ctx.strokeStyle = `rgba(242,201,138,${calor * (.55 - k * .14)})`;
          ctx.beginPath(); ctx.arc(300, 278, r, ini, ini + 1.5); ctx.stroke();
          ctx.beginPath(); ctx.arc(300, 278, r, ini + Math.PI, ini + Math.PI + 1.1); ctx.stroke();
        }
        ctx.globalAlpha = calor;
        ctx.fillStyle = '#f2c98a'; ctx.textAlign = 'center';
        ctx.font = '700 46px "Big Shoulders Stencil", "Arial Narrow", sans-serif';
        ctx.fillText(`${Math.round(lerp(24, 205, tueste))} °C`, 300, 548);
        ctx.restore();
      }
      const escala = (.55 + c2b * .45) * (1 + Math.sin(tueste * Math.PI) * .06) * (1 + seg(rotura, 0, .16) * .12);
      dibujarGrano(300, 278, 62 * escala, 90 * escala, -.42 + easeInOut(tueste) * Math.PI * 2, color, granoA);
    }

    // 3–4. Cono del filtro (relleno), molienda y contorno
    if (conoA > 0) {
      ctx.save();
      ctx.translate(0, conoY); ctx.globalAlpha = conoA;
      ctx.fillStyle = `rgba(${CREMA},.06)`;
      ctx.beginPath(); ctx.moveTo(188, 195); ctx.lineTo(412, 195); ctx.lineTo(322, 318); ctx.lineTo(278, 318); ctx.closePath(); ctx.fill();
      ctx.restore();
    }

    if (rotura > 0 && sale < 1) {
      const sh = easeOut(rotura);
      const pa = seg(rotura, 0, .12) * (1 - sale);
      const mojado = goteo * .38;
      for (const g of granos) {
        const st = easeInOut(seg(asienta, g.espera, g.espera + .5));
        const x1 = 300 + g.ox + g.bx * sh, y1 = 278 + g.oy + g.by * sh + 26 * sh * sh;
        const x = lerp(x1, g.tx, st), y = lerp(y1, g.ty + conoY, st);
        const base = g.tono < .5 ? mezcla([62, 34, 18], [98, 58, 32], g.tono * 2) : mezcla([98, 58, 32], [134, 86, 48], (g.tono - .5) * 2);
        ctx.fillStyle = rgb(mezcla(base, [28, 14, 6], mojado), pa);
        ctx.beginPath(); ctx.arc(x, y, g.r * (1 + (1 - st) * .35), 0, Math.PI * 2); ctx.fill();
      }
    }

    if (conoA > 0) {
      ctx.save();
      ctx.translate(0, conoY); ctx.globalAlpha = conoA;
      ctx.strokeStyle = `rgb(${CREMA})`; ctx.lineWidth = 3.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(180, 195); ctx.lineTo(420, 195);
      ctx.moveTo(188, 195); ctx.lineTo(278, 318); ctx.lineTo(278, 332);
      ctx.moveTo(412, 195); ctx.lineTo(322, 318); ctx.lineTo(322, 332);
      ctx.moveTo(236, 324); ctx.lineTo(364, 324);
      ctx.stroke();
      ctx.globalAlpha = conoA * .28; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(232, 208); ctx.lineTo(288, 306);
      ctx.moveTo(368, 208); ctx.lineTo(312, 306);
      ctx.moveTo(300, 208); ctx.lineTo(300, 306);
      ctx.stroke();
      ctx.restore();
    }

    // 4. Agua en espiral y goteo
    const agua = seg(goteo, 0, .1) * (1 - seg(goteo, .78, .93));
    if (agua > 0) {
      const vaiven = Math.sin(t * 2.4) * 34;
      ctx.save();
      ctx.strokeStyle = `rgba(206,228,230,${agua * .8})`; ctx.lineWidth = 5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(300 + vaiven * .25, -10); ctx.quadraticCurveTo(300 + vaiven * .5, 130, 300 + vaiven, 238); ctx.stroke();
      ctx.strokeStyle = `rgba(206,228,230,${agua * .45})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(300 + vaiven, 240, 14, 4, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
    const nivel = lerp(516, 437, goteo);
    const gotas = seg(goteo, .06, .16) * (1 - seg(goteo, .9, 1));
    if (gotas > 0) {
      ctx.fillStyle = `rgba(138,83,39,${gotas})`;
      for (let k = 0; k < 3; k++) {
        const f = (t * 1.15 + k / 3) % 1;
        const y = lerp(336, nivel - 4, f * f);
        ctx.beginPath(); ctx.ellipse(300, y, 3.6, 5.5 + f * 3, 0, 0, Math.PI * 2); ctx.fill();
      }
    }

    // 5. Taza: se llena y al final sube al centro, con vapor
    const tazaA = easeOut(seg(p, 2.25, 2.75));
    if (tazaA > 0) {
      const sube = easeInOut(sale);
      ctx.save();
      ctx.translate(300, 470 - sube * 132); ctx.scale(1 + sube * .45, 1 + sube * .45); ctx.translate(-300, -470);
      ctx.translate(0, (1 - tazaA) * 40);
      ctx.globalAlpha = tazaA;

      ctx.save();
      trazoTaza(); ctx.clip();
      ctx.fillStyle = `rgba(${CREMA},.05)`; ctx.fillRect(210, 410, 180, 120);
      if (goteo > 0) {
        ctx.fillStyle = '#4a2612'; ctx.fillRect(210, nivel, 180, 530 - nivel);
        ctx.fillStyle = '#b57a3c'; ctx.fillRect(210, nivel, 180, 5);
      }
      ctx.restore();

      ctx.strokeStyle = `rgb(${CREMA})`; ctx.lineWidth = 3.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      trazoTaza(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(378, 438); ctx.bezierCurveTo(424, 436, 424, 492, 376, 492); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(196, 532); ctx.lineTo(404, 532); ctx.stroke();

      const vapor = seg(p, 3.6, 4);
      if (vapor > 0) {
        ctx.lineWidth = 4; ctx.lineCap = 'butt';
        for (let k = 0; k < 3; k++) {
          const x0 = 262 + k * 38;
          for (let s = 0; s < 14; s++) {
            const y0 = 402 - s * 7.5, y1 = y0 - 7.5;
            const onda = y => x0 + Math.sin(y * .05 + t * 1.5 + k * 1.7) * 10 * ((402 - y) / 105);
            ctx.strokeStyle = `rgba(${CREMA},${vapor * .6 * Math.sin((s + .5) / 14 * Math.PI)})`;
            ctx.beginPath(); ctx.moveTo(onda(y0), y0); ctx.lineTo(onda(y1), y1); ctx.stroke();
          }
        }
      }
      ctx.restore();
    }
  };

  const ajustarLienzo = () => {
    const lado = Math.round(lienzo.getBoundingClientRect().width) || 600;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const px = Math.round(lado * dpr);
    if (lienzo.width !== px) { lienzo.width = px; lienzo.height = px; }
    ctx.setTransform(px / 600, 0, 0, px / 600, 0, 0);
  };

  let pObjetivo = 0, pActual = 0, enVista = false, bucle = 0, pasoActivo = -1;

  const marcarPaso = i => {
    if (i === pasoActivo) return;
    pasoActivo = i;
    pasos.forEach((li, k) => li.classList.toggle('activo', k === i));
    rutaBtns.forEach((b, k) => {
      b.classList.toggle('hecho', k < i);
      if (k === i) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
    });
  };

  const cuadro = ms => {
    bucle = 0;
    pActual += (pObjetivo - pActual) * .14;
    if (Math.abs(pObjetivo - pActual) < .0008) pActual = pObjetivo;
    dibujar(pActual, ms / 1000);
    rutaFill.style.transform = `scaleX(${clamp(pActual / 4)})`;
    if (enVista) bucle = requestAnimationFrame(cuadro);
  };

  const fijarProceso = () => {
    const fijado = !reduce.matches;
    proceso.classList.toggle('fijado', fijado);
    ajustarLienzo();
    if (fijado) {
      alDesplazar();
      if (enVista && !bucle) bucle = requestAnimationFrame(cuadro);
    } else {
      cancelAnimationFrame(bucle); bucle = 0;
      pasos.forEach(li => li.classList.add('activo'));
      dibujar(4, 0);
    }
  };

  tareas.push(vh => {
    if (!proceso.classList.contains('fijado')) return;
    const r = proceso.getBoundingClientRect();
    const total = proceso.offsetHeight - vh;
    pObjetivo = clamp(clamp(-r.top / total) * RECORRIDO, 0, 4);
    marcarPaso(clamp(Math.round(pObjetivo), 0, 4));
  });

  rutaBtns.forEach(b => b.addEventListener('click', () => {
    const total = proceso.offsetHeight - innerHeight;
    const y = proceso.getBoundingClientRect().top + scrollY + (Number(b.dataset.ir) / RECORRIDO) * total + 2;
    scrollTo({ top: y, behavior: reduce.matches ? 'auto' : 'smooth' });
  }));

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => {
      enVista = e.isIntersecting;
      if (enVista && !bucle && proceso.classList.contains('fijado')) bucle = requestAnimationFrame(cuadro);
    }).observe(proceso);
  } else { enVista = true; }

  new ResizeObserver(() => { ajustarLienzo(); if (!proceso.classList.contains('fijado')) dibujar(4, 0); else dibujar(pActual, performance.now() / 1000); }).observe(lienzo);
  reduce.addEventListener('change', fijarProceso);
  fijarProceso();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (!bucle) dibujar(proceso.classList.contains('fijado') ? pActual : 4, 0); });

  /* ---------- El espacio: la tira avanza con el scroll en escritorio ---------- */
  const tira = $('[data-tira]');
  const pista = $('[data-tira-pista]');
  const fino = matchMedia('(hover: hover) and (pointer: fine)');
  const modoTira = () => {
    const arrastre = ancho.matches && fino.matches && !reduce.matches;
    tira.classList.toggle('arrastre', arrastre);
    if (arrastre) { tira.removeAttribute('tabindex'); tira.scrollLeft = 0; }
    else { tira.tabIndex = 0; pista.style.transform = ''; }
    alDesplazar();
  };
  tareas.push(vh => {
    if (!tira.classList.contains('arrastre')) return;
    const r = tira.getBoundingClientRect();
    const p = seg(vh - r.top, vh * .12, vh + r.height * .78);
    const max = Math.max(0, pista.scrollWidth - tira.clientWidth);
    pista.style.transform = `translate3d(${(-easeInOut(p) * max).toFixed(1)}px,0,0)`;
  });
  [ancho, fino, reduce].forEach(m => m.addEventListener('change', modoTira));
  modoTira();

  /* ---------- Horario: resalta el día de hoy ---------- */
  const hoy = String(new Date().getDay());
  $$('[data-horario] tr').forEach(tr => tr.classList.toggle('hoy', tr.dataset.dias.split(',').includes(hoy)));

  /* ---------- Formulario de demostración ---------- */
  const form = $('[data-form]');
  const estado = $('[data-estado]');
  const filaReserva = $('[data-solo-reserva]');
  const mensajeLabel = $('[data-mensaje-label]');
  const f = form.elements;

  const isoLocal = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  f.fecha.min = isoLocal(new Date());

  const esReserva = () => f.tipo.value === 'Reserva';
  const HORARIO = { 0: [9, 14], 6: [8.5, 20] }; // resto de días: 7:30 a 19:00

  const reglas = {
    nombre: v => v.trim().length >= 2 ? '' : 'escribe tu nombre (al menos 2 letras).',
    correo: v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? '' : 'escribe un correo con este formato: nombre@dominio.com.',
    fecha: v => {
      if (!esReserva()) return '';
      if (!v) return 'elige el día de la visita.';
      return v < f.fecha.min ? 'la fecha ya pasó; elige hoy o un día posterior.' : '';
    },
    hora: v => {
      if (!esReserva()) return '';
      if (!v) return 'elige una hora.';
      if (!f.fecha.value) return '';
      const dia = new Date(`${f.fecha.value}T12:00`).getDay();
      const [abre, cierra] = HORARIO[dia] || [7.5, 19];
      const h = Number(v.split(':')[0]);
      const fmt = n => `${Math.floor(n)}:${n % 1 ? '30' : '00'}`;
      return h < abre || h >= cierra ? `ese día abrimos de ${fmt(abre)} a ${fmt(cierra)}; elige otra hora.` : '';
    },
    personas: v => {
      if (!esReserva()) return '';
      const n = Number(v);
      return Number.isInteger(n) && n >= 1 && n <= 8 ? '' : 'indica entre 1 y 8 personas. Para grupos más grandes, usa la consulta.';
    },
    mensaje: v => !esReserva() && v.trim().length < 10 ? 'cuéntanos tu consulta (al menos 10 caracteres).' : ''
  };

  const validar = nombre => {
    const campo = f[nombre];
    const msg = reglas[nombre](campo.value);
    const err = $(`#e-${nombre}`);
    err.textContent = msg; err.hidden = !msg;
    if (msg) campo.setAttribute('aria-invalid', 'true'); else campo.removeAttribute('aria-invalid');
    return !msg;
  };

  Object.keys(reglas).forEach(nombre => {
    const campo = f[nombre];
    campo.addEventListener('blur', () => { if (campo.value || campo.hasAttribute('aria-invalid')) validar(nombre); });
    campo.addEventListener('input', () => { if (campo.hasAttribute('aria-invalid')) validar(nombre); });
  });
  f.fecha.addEventListener('change', () => { if (f.hora.value) validar('hora'); });

  $$('input[name="tipo"]', form).forEach(r => r.addEventListener('change', () => {
    const reserva = esReserva();
    filaReserva.hidden = !reserva;
    mensajeLabel.textContent = reserva ? 'Mensaje (opcional)' : 'Tu consulta';
    ['fecha', 'hora', 'personas', 'mensaje'].forEach(n => { if (f[n].hasAttribute('aria-invalid')) validar(n); });
    estado.textContent = ''; estado.classList.remove('con-error');
  }));

  $$('[data-paso]', form).forEach(b => b.addEventListener('click', () => {
    f.personas.value = clamp((Number(f.personas.value) || 0) + Number(b.dataset.paso), 1, 8);
    validar('personas');
  }));

  const limpio = s => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  form.addEventListener('submit', e => {
    e.preventDefault();
    const malos = Object.keys(reglas).filter(n => !validar(n));
    if (malos.length) {
      estado.classList.add('con-error');
      estado.innerHTML = `<p>${malos.length === 1 ? 'Hay 1 campo por revisar.' : `Hay ${malos.length} campos por revisar.`} Los marcamos arriba.</p>`;
      f[malos[0]].focus();
      return;
    }
    estado.classList.remove('con-error');
    const filas = [['Tipo', f.tipo.value], ['Nombre', f.nombre.value.trim()], ['Correo', f.correo.value.trim()]];
    if (esReserva()) {
      const fecha = new Date(`${f.fecha.value}T12:00`).toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' });
      filas.push(['Cuándo', `${fecha}, ${f.hora.value}`], ['Personas', f.personas.value]);
    }
    if (f.mensaje.value.trim()) filas.push(['Mensaje', f.mensaje.value.trim()]);
    estado.innerHTML = `
      <h3>Datos correctos, nada enviado</h3>
      <p>Esto es una demostración: el formulario no está conectado a ningún servicio, así que tu ${esReserva() ? 'reserva' : 'consulta'} no se envió ni se guardó. Con una conexión real, la cafetería recibiría:</p>
      <ul>${filas.map(([k, v]) => `<li><b>${k}:</b> ${limpio(v)}</li>`).join('')}</ul>`;
    estado.focus({ preventScroll: true });
    estado.scrollIntoView({ block: 'nearest', behavior: reduce.matches ? 'auto' : 'smooth' });
  });

  alDesplazar();
})();
