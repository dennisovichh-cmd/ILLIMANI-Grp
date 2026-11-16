/* ==========================================================
   Instituto Técnico Illimani · Landing de una sola pantalla
   jQuery 3.7.1 · "use strict"
   ========================================================== */
$(document).ready(function () {
  'use strict';

  /* ----------------------------------------------------------
     1. CONFIGURACIÓN Y DATOS
     ---------------------------------------------------------- */
  var KEYS = {
    prices: 'illimani_prices_v1',
    theme: 'illimani_theme_v1',
    session: 'illimani_session_v1'
  };

  // Precios por defecto (en Bs). Las claves enlazan con el panel de gerente.
  // Valores tomados del sitio actual; confirmar antes de publicar.
  var DEFAULT_PRICES = {
    matricula:   { label: 'Matrícula anual', amount: 200 },
    mensualidad: { label: 'Mensualidad',     amount: 490 }
  };

  // Acceso SIMULADO (solo demo, sin seguridad real).
  var USERS = {
    cliente: { password: 'cliente2026' },
    gerente: { password: 'gerente2026' }
  };

  var TURNOS = ['Mañana · 08:30 – 12:30', 'Tarde · 14:30 – 18:30', 'Noche · 18:30 – 21:30'];

  var state = {
    session: null,              // 'cliente' | 'gerente' | null
    prices: copyPrices(DEFAULT_PRICES),
    datos: null,                // datos del formulario validados
    toastTimer: null
  };

  /* ----------------------------------------------------------
     2. UTILIDADES (localStorage con try/catch)
     ---------------------------------------------------------- */
  function storageGet(key) {
    try { return window.localStorage.getItem(key); } catch (e) { return null; }
  }
  function storageSet(key, value) {
    try { window.localStorage.setItem(key, value); } catch (e) { /* sin acceso */ }
  }
  function storageRemove(key) {
    try { window.localStorage.removeItem(key); } catch (e) { /* sin acceso */ }
  }
  function copyPrices(src) {
    var out = {};
    Object.keys(src).forEach(function (k) {
      out[k] = { label: src[k].label, amount: src[k].amount };
    });
    return out;
  }
  function formatBs(n) { return 'Bs ' + n; }
  function isTyping(el) {
    return $(el).is('input, textarea, select, [contenteditable="true"]');
  }
  function isModalOpen() { return $('.modal.is-open').length > 0; }

  /* ----------------------------------------------------------
     3. TEMA CLARO / OSCURO
     ---------------------------------------------------------- */
  function applyTheme(theme) {
    var t = theme === 'light' ? 'light' : 'dark';
    $('body').removeClass('theme-dark theme-light').addClass('theme-' + t);
    $('#themeToggle').attr('aria-label', t === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
  }
  applyTheme(storageGet(KEYS.theme) || 'dark');

  $('#themeToggle').on('click', function () {
    var next = $('body').hasClass('theme-dark') ? 'light' : 'dark';
    applyTheme(next);
    storageSet(KEYS.theme, next);
  });

  /* ----------------------------------------------------------
     4. CARRUSELES (función reutilizable initCarousel)
     ---------------------------------------------------------- */
  var carousels = []; // { page, inst }

  function initCarousel($root, opts) {
    opts = opts || {};
    var delay = opts.interval || 5000;
    var $slides = $root.find('.slide');
    var count = $slides.length;
    if (!count) return null;

    var index = 0;
    var timer = null;
    var $dots = $root.find('.carousel-dots').empty();

    $slides.each(function (i) {
      $dots.append(
        $('<button type="button"></button>')
          .attr('aria-label', 'Ir a diapositiva ' + (i + 1))
          .attr('data-i', i)
      );
    });

    function show(i) {
      index = (i + count) % count;
      $slides.each(function (k) {
        var on = k === index;
        $(this).toggleClass('is-active', on).attr('aria-hidden', on ? 'false' : 'true');
      });
      $dots.children().each(function (k) {
        $(this).toggleClass('is-active', k === index);
      });
    }

    function stop() {
      if (timer) { clearInterval(timer); timer = null; } // nunca dos intervalos a la vez
    }
    function start() {
      stop();
      if (opts.autoplay === false) return;
      timer = setInterval(function () { show(index + 1); }, delay);
    }

    $root.on('click', '.carousel-prev', function () { show(index - 1); });
    $root.on('click', '.carousel-next', function () { show(index + 1); });
    $root.on('click', '.carousel-dots button', function () { show(+$(this).attr('data-i')); });

    // Pausa al pasar el cursor
    $root.on('mouseenter', stop).on('mouseleave', start);

    // Deslizamiento táctil
    var startX = 0;
    $root.find('.carousel-track')
      .on('touchstart', function (e) { startX = e.originalEvent.touches[0].clientX; stop(); })
      .on('touchend', function (e) {
        var dx = e.originalEvent.changedTouches[0].clientX - startX;
        if (Math.abs(dx) > 40) show(index + (dx < 0 ? 1 : -1));
        start();
      });

    show(0);
    start();
    return { show: show, start: start, stop: stop };
  }

  $('.carousel').each(function () {
    var $root = $(this);
    var inst = initCarousel($root, { interval: 5000 });
    if (inst) {
      carousels.push({ page: $root.closest('.page').attr('data-page'), inst: inst });
    }
  });

  /* ----------------------------------------------------------
     5. NAVEGACIÓN ENTRE SECCIONES (sin scroll de página)
     ---------------------------------------------------------- */
  function visiblePages() {
    return $('.page').filter(function () { return !$(this).hasClass('is-locked'); });
  }

  function currentIndex() {
    return visiblePages().index($('.page.is-active'));
  }

  function updateCarousels(activeId) {
    carousels.forEach(function (c) {
      if (c.page === activeId) c.inst.start(); else c.inst.stop();
    });
  }

  function rebuildDots() {
    var $wrap = $('.side-dots').empty();
    var currentId = $('.page.is-active').attr('data-page');
    visiblePages().each(function () {
      var id = $(this).attr('data-page');
      var label = $(this).attr('aria-label') || id;
      $wrap.append(
        $('<button type="button"></button>')
          .attr({ 'aria-label': 'Ir a ' + label, 'data-page': id })
          .toggleClass('is-active', id === currentId)
      );
    });
  }

  function updateArrows() {
    var idx = currentIndex();
    var last = visiblePages().length - 1;
    $('#pageUp').prop('disabled', idx <= 0);
    $('#pageDown').prop('disabled', idx >= last);
  }

  function updateNavActive(id) {
    $('.main-nav a').removeClass('is-active')
      .filter('[data-target="' + id + '"]').addClass('is-active');
  }

  function goTo(id) {
    var $target = visiblePages().filter('[data-page="' + id + '"]');
    if (!$target.length) $target = visiblePages().first();
    var pid = $target.attr('data-page');

    $('.page').removeClass('is-active').attr('aria-hidden', 'true');
    $target.addClass('is-active').attr('aria-hidden', 'false');

    if (location.hash !== '#' + pid && history.replaceState) {
      history.replaceState(null, '', '#' + pid);
    }

    rebuildDots();
    updateArrows();
    updateNavActive(pid);
    updateCarousels(pid);
  }

  function step(delta) {
    var list = visiblePages();
    var idx = currentIndex() + delta;
    if (idx < 0 || idx >= list.length) return;
    goTo(list.eq(idx).attr('data-page'));
  }

  $('#pageUp').on('click', function () { step(-1); });
  $('#pageDown').on('click', function () { step(1); });

  $('.side-dots').on('click', 'button', function () {
    goTo($(this).attr('data-page'));
  });

  // Enlaces con data-target (menú y botones)
  $(document).on('click', '[data-target]', function (e) {
    var id = $(this).attr('data-target');
    if (!$('#' + id).length) return;
    e.preventDefault();
    goTo(id);
    closeMobileMenu();
  });

  // Teclado: flechas, PageUp/PageDown, Inicio/Fin
  $(document).on('keydown', function (e) {
    if (isTyping(e.target) || isModalOpen()) return;
    switch (e.key) {
      case 'ArrowDown':
      case 'PageDown':
        e.preventDefault(); step(1); break;
      case 'ArrowUp':
      case 'PageUp':
        e.preventDefault(); step(-1); break;
      case 'Home':
        e.preventDefault(); goTo(visiblePages().first().attr('data-page')); break;
      case 'End':
        e.preventDefault(); goTo(visiblePages().last().attr('data-page')); break;
    }
  });

  // Rueda del ratón: un paso por gesto con bloqueo breve
  var wheelLock = false;
  $(window).on('wheel', function (e) {
    if (wheelLock || isModalOpen()) return;
    var dy = e.originalEvent.deltaY;
    if (Math.abs(dy) < 20) return;
    wheelLock = true;
    step(dy > 0 ? 1 : -1);
    setTimeout(function () { wheelLock = false; }, 700);
  });

  // Deslizamiento vertical en celular (entre secciones)
  var touchY = 0, touchX = 0;
  $('#pages').on('touchstart', function (e) {
    touchY = e.originalEvent.touches[0].clientY;
    touchX = e.originalEvent.touches[0].clientX;
  }).on('touchend', function (e) {
    var t = e.originalEvent.changedTouches[0];
    var dy = t.clientY - touchY, dx = t.clientX - touchX;
    if (Math.abs(dy) > 60 && Math.abs(dy) > Math.abs(dx)) step(dy < 0 ? 1 : -1);
  });

  // Enlaces con hash (#seccion)
  $(window).on('hashchange', function () {
    goTo(location.hash.replace('#', '') || 'inicio');
  });

  /* ----------------------------------------------------------
     6. MENÚ HAMBURGUESA (≤ 760 px)
     ---------------------------------------------------------- */
  function closeMobileMenu() {
    $('#menuToggle').attr('aria-expanded', 'false');
    if ($(window).width() <= 760) $('#mainNav').stop(true, true).slideUp(200);
  }

  $('#menuToggle').on('click', function () {
    var open = $(this).attr('aria-expanded') === 'true';
    $(this).attr('aria-expanded', open ? 'false' : 'true');
    $('#mainNav').stop(true, true).slideToggle(200);
  });

  $(window).on('resize', function () {
    if ($(window).width() > 760) {
      $('#mainNav').stop(true, true).removeAttr('style');
      $('#menuToggle').attr('aria-expanded', 'false');
    }
  });

  /* ----------------------------------------------------------
     7. PESTAÑAS DE TURNOS (fundido jQuery)
     ---------------------------------------------------------- */
  function selectTab($tab) {
    var key = $tab.attr('data-key');
    var $panels = $('#turnos .tab-panel');
    var $old = $panels.filter('.is-active');
    var $new = $panels.filter('[data-key="' + key + '"]');
    if ($new.is($old)) return;

    $('#turnos .tab').removeClass('is-active').attr({ 'aria-selected': 'false', tabindex: '-1' });
    $tab.addClass('is-active').attr({ 'aria-selected': 'true', tabindex: '0' });

    // Oculta el anterior y muestra el nuevo con fundido
    $old.stop(true, true).removeClass('is-active').css('opacity', '');
    $new.stop(true, true).addClass('is-active').css('opacity', 0)
      .animate({ opacity: 1 }, 280, function () { $(this).css('opacity', ''); });
  }

  $(document).on('click', '#turnos .tab', function () { selectTab($(this)); });

  $(document).on('keydown', '#turnos .tab', function (e) {
    var $tabs = $('#turnos .tab');
    var i = $tabs.index(this);
    if (e.key === 'ArrowRight') { e.preventDefault(); selectTab($tabs.eq((i + 1) % $tabs.length)); }
    if (e.key === 'ArrowLeft')  { e.preventDefault(); selectTab($tabs.eq((i - 1 + $tabs.length) % $tabs.length)); }
  });

  /* ----------------------------------------------------------
     8. ACORDEÓN DE PREGUNTAS FRECUENTES
     ---------------------------------------------------------- */
  $(document).on('click', '.acc-btn', function () {
    var $btn = $(this);
    var $panel = $('#' + $btn.attr('aria-controls'));
    var open = $btn.attr('aria-expanded') === 'true';
    $btn.attr('aria-expanded', open ? 'false' : 'true');
    if (open) { $panel.stop(true, true).slideUp(180); }
    else { $panel.stop(true, true).slideDown(180); }
  });

  /* ----------------------------------------------------------
     9. PRECIOS (lectura, panel de gerente y render)
     ---------------------------------------------------------- */
  function loadPrices() {
    var raw = storageGet(KEYS.prices);
    if (!raw) return copyPrices(DEFAULT_PRICES);
    try {
      var saved = JSON.parse(raw);
      var out = copyPrices(DEFAULT_PRICES);
      Object.keys(out).forEach(function (k) {
        var n = Number(saved[k] && saved[k].amount);
        if (isFinite(n) && n >= 0) out[k].amount = Math.round(n);
      });
      return out;
    } catch (e) {
      return copyPrices(DEFAULT_PRICES);
    }
  }

  function renderPrices() {
    $('[data-price]').each(function () {
      var key = $(this).attr('data-price');
      if (state.prices[key]) $(this).text(formatBs(state.prices[key].amount));
    });
    $('#priceForm input').each(function () {
      var key = $(this).attr('name');
      if (state.prices[key]) $(this).val(state.prices[key].amount);
    });
    // Si el usuario está en el paso de montos o QR, recalcular en vivo
    if ($('.insc-step.is-active').attr('data-step') !== '1') renderPaymentSteps();
  }

  $('#priceForm').on('submit', function (e) {
    e.preventDefault();
    var $msg = $('#priceMsg');
    var next = copyPrices(state.prices);
    var valid = true;

    $(this).find('input').each(function () {
      var key = $(this).attr('name');
      var n = Number($(this).val());
      if ($(this).val() === '' || !isFinite(n) || n < 0 || n > 100000) valid = false;
      else next[key].amount = Math.round(n);
    });

    if (!valid) {
      $msg.removeClass('is-ok').text('Revisa los montos: deben ser números entre 0 y 100000.');
      return;
    }

    state.prices = next;
    storageSet(KEYS.prices, JSON.stringify(next));
    renderPrices();
    $msg.addClass('is-ok').text('Cambios guardados y aplicados a la inscripción.');
  });

  $('#restorePrices').on('click', function () {
    storageRemove(KEYS.prices);
    state.prices = copyPrices(DEFAULT_PRICES);
    renderPrices();
    $('#priceMsg').addClass('is-ok').text('Valores originales restaurados.');
  });

  /* ----------------------------------------------------------
     10. INSCRIPCIÓN EN PASOS (solo cliente)
     Paso 1: formulario de datos
     Paso 2: horario y montos a cancelar
     Paso 3: pago con QR
     ---------------------------------------------------------- */
  var STEP_DATA = { step: 1 };

  function goStep(n) {
    STEP_DATA.step = n;
    $('.insc-step').removeClass('is-active');
    $('.insc-step[data-step="' + n + '"]').addClass('is-active');
    $('.step-dot').each(function () {
      var s = +$(this).attr('data-step');
      $(this).toggleClass('is-current', s === n).toggleClass('is-done', s < n);
    });
    if (n > 1) renderPaymentSteps();
  }

  // Validación del formulario
  function validateForm($form) {
    var errors = [];
    var nombres = $.trim($form.find('[name="nombres"]').val());
    var apellidos = $.trim($form.find('[name="apellidos"]').val());
    var ci = $.trim($form.find('[name="ci"]').val());
    var celular = $.trim($form.find('[name="celular"]').val());
    var correo = $.trim($form.find('[name="correo"]').val());
    var turno = $form.find('[name="turno"]').val();
    var paquetes = [];

    $form.find('input[name="paquete"]:checked').each(function () { paquetes.push($(this).val()); });

    if (!nombres) errors.push('Escribe tus nombres.');
    if (!apellidos) errors.push('Escribe tus apellidos.');
    if (!/^[0-9A-Za-z\-]{5,12}$/.test(ci)) errors.push('Carnet de Identidad no válido.');
    if (!/^[0-9]{7,8}$/.test(celular.replace(/\s/g, ''))) errors.push('Celular no válido (7 u 8 dígitos).');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) errors.push('Correo electrónico no válido.');
    if (turno === '' || turno === undefined) errors.push('Selecciona un turno.');
    if (!paquetes.length) errors.push('Selecciona al menos un paquete a pagar.');

    if (errors.length) return { ok: false, msg: errors[0] };

    return {
      ok: true,
      datos: {
        nombres: nombres,
        apellidos: apellidos,
        ci: ci,
        celular: celular.replace(/\s/g, ''),
        correo: correo,
        turno: Number(turno),
        paquetes: paquetes
      }
    };
  }

  function computeTotal(paquetes) {
    var sum = 0;
    paquetes.forEach(function (k) {
      if (state.prices[k]) sum += state.prices[k].amount;
    });
    return sum;
  }

  // Renderiza el resumen de datos, montos y el QR (pasos 2 y 3)
  function renderPaymentSteps() {
    var d = state.datos;
    if (!d) return;
    var total = computeTotal(d.paquetes);

    // Paso 2: datos y horario
    var $recap = $('#recap').empty();
    $recap.append($('<li></li>').text('Nombre: ' + d.nombres + ' ' + d.apellidos));
    $recap.append($('<li></li>').text('Carnet de Identidad: ' + d.ci));
    $recap.append($('<li></li>').text('Celular: ' + d.celular));
    $recap.append($('<li></li>').text('Correo: ' + d.correo));
    $recap.append($('<li></li>').text('Turno: ' + TURNOS[d.turno]));

    var $amounts = $('#amountList').empty();
    d.paquetes.forEach(function (k) {
      $amounts.append($('<li></li>').text(state.prices[k].label + ': ' + formatBs(state.prices[k].amount)));
    });
    $('#amountTotal').text('Total: ' + formatBs(total));

    // Paso 3: QR con el total
    $('#qrTotal').text('Total a pagar: ' + formatBs(total));
    $('#qrBox').html(buildFakeQR(total + d.ci.length));
  }

  // QR simulado (patrón decorativo, no es un código real)
  function buildFakeQR(seed) {
    var size = 21, cells = '', s = seed * 9301 + 49297;
    for (var y = 0; y < size; y++) {
      for (var x = 0; x < size; x++) {
        s = (s * 9301 + 49297) % 233280;
        var finder = (x < 7 && y < 7) || (x > 13 && y < 7) || (x < 7 && y > 13);
        var on = finder
          ? ((x % 6 === 0 || y % 6 === 0 || (x > 1 && x < 5 && y > 1 && y < 5)) ? 1 : 0)
          : (s / 233280 > 0.5 ? 1 : 0);
        if (on) cells += '<rect x="' + x + '" y="' + y + '" width="1" height="1"/>';
      }
    }
    return '<svg viewBox="0 0 21 21" shape-rendering="crispEdges" role="img" aria-label="QR de pago simulado"><rect width="21" height="21" fill="#fff"/><g fill="#000">' + cells + '</g></svg>';
  }

  function showToast(text) {
    var $t = $('#toast').text(text).stop(true, true).fadeIn(200);
    if (state.toastTimer) clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(function () { $t.fadeOut(300); }, 3500);
  }

  function resetInscripcion() {
    state.datos = null;
    $('#inscForm')[0].reset();
    $('#formMsg').text('');
    $('#finishMsg').text('');
    goStep(1);
  }

  // Paso 1 → 2
  $('#inscForm').on('submit', function (e) {
    e.preventDefault();
    var res = validateForm($(this));
    if (!res.ok) {
      $('#formMsg').text(res.msg);
      return;
    }
    $('#formMsg').text('');
    state.datos = res.datos;
    goStep(2);
  });

  // Botones "Volver" y "Pagar con QR"
  $(document).on('click', '#inscripcion [data-go]', function () {
    var target = +$(this).attr('data-go');
    if (target === 1 || !state.datos) { goStep(1); return; }
    goStep(target);
  });

  // Confirmación final del pago
  $('#finishPay').on('click', function () {
    $('#finishMsg').text('Gracias. Tu pago será verificado y te contactaremos al correo indicado.');
    showToast('Inscripción registrada (simulada).');
    setTimeout(resetInscripcion, 2500);
  });

  /* ----------------------------------------------------------
     11. INICIO / CIERRE DE SESIÓN SIMULADO
     ---------------------------------------------------------- */
  function applyAccess() {
    var role = state.session;
    $('body').attr('data-session', role || 'none');

    $('[data-access]').each(function () {
      var ok = $(this).attr('data-access') === role;
      $(this).toggleClass('is-locked', !ok);
    });

    $('#authBtn').text(role ? 'Cerrar sesión' : 'Iniciar sesión');

    // Si la página actual quedó oculta, ir al inicio
    var current = $('.page.is-active').attr('data-page');
    if ($('.page[data-page="' + current + '"]').hasClass('is-locked')) goTo('inicio');
    else { rebuildDots(); updateArrows(); }
  }

  function loadSession() {
    var s = storageGet(KEYS.session);
    state.session = (s === 'cliente' || s === 'gerente') ? s : null;
  }

  function logout() {
    state.session = null;
    storageRemove(KEYS.session);
    resetInscripcion();
    applyAccess();
    showToast('Sesión cerrada. La inscripción en curso se limpió.');
  }

  function openModal(id) { $('#' + id).addClass('is-open').attr('aria-hidden', 'false'); }
  function closeModal(id) { $('#' + id).removeClass('is-open').attr('aria-hidden', 'true'); }

  $('#authBtn').on('click', function () {
    if (state.session) { logout(); return; }
    $('#loginMsg').text('');
    $('#loginForm')[0].reset();
    $('#loginForm input[name="role"][value="cliente"]').prop('checked', true);
    openModal('authModal');
    $('#loginUser').trigger('focus');
  });

  $('#authModal .modal-close').on('click', function () { closeModal('authModal'); });

  $('#loginForm').on('submit', function (e) {
    e.preventDefault();
    var role = $('input[name="role"]:checked').val();
    var user = $.trim($('#loginUser').val());
    var pass = $('#loginPass').val();
    var $msg = $('#loginMsg');

    if (!user || !pass) { $msg.text('Completa usuario y contraseña.'); return; }
    if (user !== role || !USERS[role] || USERS[role].password !== pass) {
      $msg.text('Usuario o contraseña incorrectos (demo).');
      return;
    }

    state.session = role;
    storageSet(KEYS.session, role);
    closeModal('authModal');
    applyAccess();
    showToast('Sesión iniciada como ' + role + '.');
    goTo(role === 'gerente' ? 'gerente' : 'inscripcion');
  });

  /* ----------------------------------------------------------
     12. CIERRE DEL MODAL (Escape, clic fuera, botón)
     ---------------------------------------------------------- */
  $(document).on('keydown', function (e) {
    if (e.key === 'Escape' && $('#authModal').hasClass('is-open')) closeModal('authModal');
  });

  $('#authModal').on('click', function (e) {
    if (e.target === this) closeModal('authModal');
  });

  /* ----------------------------------------------------------
     13. ARRANQUE
     ---------------------------------------------------------- */
  $('#year').text(new Date().getFullYear());
  loadSession();
  state.prices = loadPrices();
  applyAccess();
  renderPrices();
  goStep(1);

  goTo(location.hash.replace('#', '') || 'inicio');

  // Registrar service worker (PWA opcional)
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    try {
      navigator.serviceWorker.register('sw.js?v=1').catch(function () { /* opcional */ });
    } catch (e) { /* opcional */ }
  }
});