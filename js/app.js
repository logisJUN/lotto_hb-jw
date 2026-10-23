/* 로또랩 - 화면 동작 (순수 JavaScript, 라이브러리 없음)
   모든 수치는 data/lotto.json(매주 자동 갱신)으로 계산합니다. */
(function () {
  'use strict';

  /* =====================================================
     공통 유틸
     ===================================================== */
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var page = document.body.getAttribute('data-page');
  var VAULT_KEY = 'lottolab.vault', THEME_KEY = 'lottolab.theme';
  var DAY = 864e5, DRAW_UTC_MIN = 11 * 60 + 35;   // 추첨: 토요일 20:35(KST) = 11:35(UTC)
  var WEEK = ['일', '월', '화', '수', '목', '금', '토'];

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function zone(n) { return n <= 10 ? 'y' : n <= 20 ? 'b' : n <= 30 ? 'r' : n <= 40 ? 'g' : 'n'; }
  function sum(a) { return a.reduce(function (x, y) { return x + y; }, 0); }
  function oddCount(a) { return a.filter(function (n) { return n % 2; }).length; }
  function consecutivePairs(a) { var c = 0; for (var i = 1; i < a.length; i++) if (a[i] - a[i - 1] === 1) c++; return c; }
  function longestRun(a) { var best = 1, cur = 1; for (var i = 1; i < a.length; i++) { cur = a[i] - a[i - 1] === 1 ? cur + 1 : 1; if (cur > best) best = cur; } return best; }
  function sameEndMax(a) { var m = {}, mx = 0; a.forEach(function (n) { var k = n % 10; m[k] = (m[k] || 0) + 1; if (m[k] > mx) mx = m[k]; }); return mx; }
  function rnd(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
  function byNum(a, b) { return a - b; }
  function comma(n) { return Math.round(n).toLocaleString('ko-KR'); }
  function pct(n, d, digits) { return (d ? n / d * 100 : 0).toFixed(digits == null ? 1 : digits) + '%'; }
  function won(n) {
    if (n >= 1e8) return (n / 1e8).toFixed(n >= 1e10 ? 0 : 1).replace(/\.0$/, '') + '억원';
    if (n >= 1e4) return comma(n / 1e4) + '만원';
    return comma(n) + '원';
  }
  function fmtDate(iso, withDay) {
    var d = new Date(iso + 'T00:00:00Z');
    return iso.replace(/-/g, '.') + (withDay ? ' (' + WEEK[d.getUTCDay()] + ')' : '');
  }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  function ball(n, cls) { return '<span class="ball ' + zone(n) + (cls ? ' ' + cls : '') + '">' + n + '</span>'; }
  // nums: 번호 6개, opt.bonus: 보너스, opt.size: 'sm'|'lg', opt.hits: 강조할 번호 목록(나머지는 흐리게)
  function balls(nums, opt) {
    opt = opt || {};
    var size = opt.size || '';
    function cls(n) { return size + (opt.hits ? (opt.hits.indexOf(n) >= 0 ? ' hit' : ' off') : ''); }
    var html = nums.map(function (n) { return ball(n, cls(n)); }).join('');
    if (opt.bonus != null) html += '<span class="plus" aria-hidden="true">+</span>' + ball(opt.bonus, cls(opt.bonus));
    return '<div class="balls' + (opt.nowrap ? ' nowrap' : '') + (opt.bonus != null ? ' bonus' : '') + '" role="img" aria-label="' + nums.join(', ') + (opt.bonus != null ? ', 보너스 ' + opt.bonus : '') + '">' + html + '</div>';
  }

  /* 아이콘 (24px 선 아이콘) */
  var ICON = {
    home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
    spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    bookmark: '<path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
    auto: '<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/>',
    refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>',
    copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/>',
    save: '<path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M5 7l1 13a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1l1-13M9 7V4h6v3"/>',
    right: '<path d="m9 6 6 6-6 6"/>',
    left: '<path d="m15 6-6 6 6 6"/>'
  };
  function icon(name, size) {
    return '<svg viewBox="0 0 24 24" width="' + (size || 20) + '" height="' + (size || 20) + '" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICON[name] + '</svg>';
  }

  var toastEl, toastTimer;
  function toast(msg) {
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'toast'; toastEl.setAttribute('role', 'status'); document.body.appendChild(toastEl); }
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 2000);
  }
  function copyText(t) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(t).then(function () { return true; }, function () { return false; });
    }
    return Promise.resolve(false);
  }
  function copySets(sets) {
    var t = sets.map(function (s) { return s.map(pad).join(' '); }).join('\n');
    copyText(t).then(function (ok) { toast(ok ? sets.length + '게임을 복사했습니다' : '이 브라우저에서는 복사할 수 없습니다'); });
  }

  /* 보관함 (이 기기의 localStorage) */
  function loadVault() { try { return JSON.parse(localStorage.getItem(VAULT_KEY)) || []; } catch (e) { return []; } }
  function saveVault(list) { try { localStorage.setItem(VAULT_KEY, JSON.stringify(list)); return true; } catch (e) { return false; } }
  function addToVault(sets, label) {
    var v = loadVault(), t = new Date().toISOString();
    sets.forEach(function (s) { v.unshift({ nums: s.slice().sort(byNum), label: label || '', at: t }); });
    if (saveVault(v.slice(0, 200))) toast('보관함에 ' + sets.length + '게임을 저장했습니다'); else toast('저장 공간을 사용할 수 없습니다');
  }

  /* =====================================================
     당첨 데이터
     ===================================================== */
  var drawsPromise;
  function loadDraws() {
    if (!drawsPromise) {
      drawsPromise = fetch('data/lotto.json', { cache: 'no-cache' }).then(function (r) {
        if (!r.ok) throw new Error(r.status);
        return r.json();
      });
    }
    return drawsPromise;
  }
  function drawAt(d) { return Date.parse(d.date + 'T00:00:00Z') + DRAW_UTC_MIN * 6e4; }
  // 다음 추첨: 마지막 추첨 다음 주부터, 추첨 뒤 3시간(결과 집계)이 지나지 않은 첫 추첨
  function nextDraw(last) {
    var at = drawAt(last) + 7 * DAY, round = last.round + 1, now = Date.now();
    while (at + 3 * 3600e3 < now) { at += 7 * DAY; round++; }
    return { round: round, at: at };
  }
  function kstDateText(ms) {
    var d = new Date(ms + 9 * 3600e3);
    return (d.getUTCMonth() + 1) + '월 ' + d.getUTCDate() + '일 (' + WEEK[d.getUTCDay()] + ') 오후 8:35';
  }
  function kstDay(ms) { return Math.floor((ms + 9 * 3600e3) / DAY); }
  // 등수: 1(6개) 2(5개+보너스) 3(5개) 4(4개) 5(3개), 0은 낙첨
  function rankOf(nums, d) {
    var m = nums.filter(function (n) { return d.numbers.indexOf(n) >= 0; }).length;
    if (m === 6) return 1;
    if (m === 5) return nums.indexOf(d.bonus) >= 0 ? 2 : 3;
    return m === 4 ? 4 : m === 3 ? 5 : 0;
  }
  function prizeOf(rank, d) {
    if (!rank) return 0;
    if (d.prizes) return d.prizes[rank - 1] || 0;
    return rank === 1 ? d.firstPrize || 0 : rank === 4 ? 50000 : rank === 5 ? 5000 : 0;
  }
  function hitsOf(nums, d) { return nums.filter(function (n) { return d.numbers.indexOf(n) >= 0 || n === d.bonus; }); }
  var RANK_TEXT = ['낙첨', '1등', '2등', '3등', '4등', '5등'];

  /* =====================================================
     공통 틀: 머리말, 하단 탭, 테마
     ===================================================== */
  var TABS = [
    ['index', 'index.html', '홈', 'home'],
    ['combiner', 'combiner.html', '번호 생성', 'spark'],
    ['stats', 'stats.html', '통계', 'chart'],
    ['simulator', 'simulator.html', '당첨 조회', 'search'],
    ['vault', 'vault.html', '보관함', 'bookmark']
  ];
  var THEME_NAME = { system: '기기 설정', light: '라이트', dark: '다크' };
  function themePref() { try { return localStorage.getItem(THEME_KEY) || 'system'; } catch (e) { return 'system'; } }
  function applyTheme(pref) {
    var t = pref === 'light' || pref === 'dark' ? pref : (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', t);
    var meta = $('meta[name="theme-color"]'); if (meta) meta.setAttribute('content', t === 'dark' ? '#0b1020' : '#f4f6fb');
    var btn = $('#theme-btn');
    if (btn) {
      btn.innerHTML = icon(pref === 'light' ? 'sun' : pref === 'dark' ? 'moon' : 'auto');
      btn.setAttribute('aria-label', '화면 테마: ' + THEME_NAME[pref] + ' (눌러서 바꾸기)');
      btn.title = '테마: ' + THEME_NAME[pref];
    }
  }
  function initShell() {
    var top = $('#top');
    if (top) {
      top.innerHTML =
        '<a class="brand" href="index.html" aria-label="로또랩 홈">' +
        '<svg class="brand-mark" viewBox="0 0 34 34" aria-hidden="true"><rect width="34" height="34" rx="10" fill="#4f46e5"/><circle cx="12" cy="13" r="5" fill="#fbbf24"/><circle cx="22" cy="13" r="5" fill="#60a5fa"/><circle cx="17" cy="22" r="5" fill="#f87171"/></svg>' +
        '<span><span class="brand-name">로또랩</span><span class="brand-sub" id="next-sub">당첨 데이터를 불러오는 중</span></span></a>' +
        '<button class="icon-btn" id="theme-btn" type="button"></button>';
      $('#theme-btn').addEventListener('click', function () {
        var order = ['system', 'light', 'dark'], next = order[(order.indexOf(themePref()) + 1) % 3];
        try { if (next === 'system') localStorage.removeItem(THEME_KEY); else localStorage.setItem(THEME_KEY, next); } catch (e) {}
        applyTheme(next);
        toast('화면 테마: ' + (next === 'system' ? '기기 설정을 따름' : THEME_NAME[next]));
      });
    }
    if (window.matchMedia) {
      var mq = matchMedia('(prefers-color-scheme: dark)');
      var onChange = function () { applyTheme(themePref()); };
      if (mq.addEventListener) mq.addEventListener('change', onChange); else if (mq.addListener) mq.addListener(onChange);
    }
    applyTheme(themePref());

    var nav = $('#tabbar');
    if (nav) nav.innerHTML = TABS.map(function (t) {
      return '<a class="tab" href="' + t[1] + '"' + (t[0] === page ? ' aria-current="page"' : '') + '>' + icon(t[3], 24) + '<span>' + t[2] + '</span></a>';
    }).join('');

    loadDraws().then(function (draws) {
      var next = nextDraw(draws[draws.length - 1]), now = Date.now(), days = kstDay(next.at) - kstDay(now);
      $('#next-sub').innerHTML = '제 <b>' + next.round + '회</b> 추첨 ' + (next.at <= now ? '결과 집계 중' : days === 0 ? '오늘 저녁' : 'D-' + days);
    }).catch(function () { $('#next-sub').textContent = '당첨 데이터를 불러오지 못했습니다'; });
  }

  // 데이터를 못 읽었을 때 본문에 보여 줄 안내
  function loadError(el) {
    if (el) el.innerHTML = '<div class="empty"><b>당첨 데이터를 불러오지 못했어요</b><p>인터넷 연결을 확인한 뒤 새로고침해 주세요.</p><button class="btn btn-secondary" type="button" onclick="location.reload()">새로고침</button></div>';
  }

  /* =====================================================
     번호 생성 엔진 (홈 빠른 뽑기 + 번호 생성 화면)
     ===================================================== */
  // opt: fixed[], excluded[], odd[] (허용하는 홀수 개수), sumMin, sumMax, noRun3, noSameEnd3
  function generate(count, opt) {
    opt = opt || {};
    var fixed = opt.fixed || [], excluded = opt.excluded || [];
    var pool = []; for (var n = 1; n <= 45; n++) if (fixed.indexOf(n) < 0 && excluded.indexOf(n) < 0) pool.push(n);
    var out = [], seen = {}, tries = 0;
    while (out.length < count && tries < 40000) {
      tries++;
      var p = pool.slice(), s = fixed.slice();
      while (s.length < 6 && p.length) s.push(p.splice(rnd(0, p.length - 1), 1)[0]);
      if (s.length < 6) break;
      s.sort(byNum);
      var key = s.join(',');
      if (seen[key]) continue;
      if (opt.odd && opt.odd.length && opt.odd.indexOf(oddCount(s)) < 0) continue;
      if (opt.sumMin != null && sum(s) < opt.sumMin) continue;
      if (opt.sumMax != null && sum(s) > opt.sumMax) continue;
      if (opt.noRun3 && longestRun(s) >= 3) continue;
      if (opt.noSameEnd3 && sameEndMax(s) >= 3) continue;
      seen[key] = 1; out.push(s);
    }
    return out;
  }
  function gameMeta(s) { var o = oddCount(s); return '홀짝 ' + o + ':' + (6 - o) + ' · 합계 ' + sum(s); }
  function gamesHTML(sets, withSave) {
    return sets.map(function (s, i) {
      var L = String.fromCharCode(65 + i);
      return '<div class="game"><span class="game-label">' + L + '</span>' +
        '<div class="game-body">' + balls(s, { size: 'sm', nowrap: true }) + '<div class="game-meta">' + gameMeta(s) + '</div></div>' +
        (withSave ? '<div class="game-actions"><button class="icon-btn" type="button" data-save="' + i + '" aria-label="' + L + ' 게임 저장">' + icon('save') + '</button></div>' : '') +
        '</div>';
    }).join('');
  }

  /* =====================================================
     보관함 결과 (홈 요약 + 보관함 화면 공용)
     ===================================================== */
  // 저장한 시각 이후 첫 추첨이 대상 회차입니다. 아직 추첨 전이면 draw 없음.
  function vaultResult(o, draws) {
    var at = Date.parse(o.at), target = null;
    for (var i = draws.length - 1; i >= 0; i--) { if (drawAt(draws[i]) > at) target = draws[i]; else break; }
    if (!target) return { o: o, round: nextDraw(draws[draws.length - 1]).round };
    return { o: o, draw: target, round: target.round, rank: rankOf(o.nums, target), hits: hitsOf(o.nums, target) };
  }
  function vaultRowHTML(r, i, withActions) {
    var badge = !r.draw ? '<span class="badge wait">' + r.round + '회 추첨 대기</span>'
      : r.rank ? '<span class="badge win">' + r.round + '회 ' + RANK_TEXT[r.rank] + '</span>'
        : '<span class="badge">' + r.round + '회 낙첨</span>';
    var d = new Date(r.o.at);
    var when = isNaN(d) ? '' : (d.getMonth() + 1) + '월 ' + d.getDate() + '일 저장';
    return '<div class="game"><div class="game-body">' +
      balls(r.o.nums, { size: 'sm', nowrap: true, hits: r.draw ? r.hits : null }) +
      '<div class="game-meta">' + badge + ' <span>' + esc(r.o.label || '저장') + ' · ' + when + '</span></div></div>' +
      (withActions ? '<div class="game-actions"><button class="icon-btn" type="button" data-copy="' + i + '" aria-label="복사">' + icon('copy') + '</button>' +
        '<button class="icon-btn btn-danger" type="button" data-del="' + i + '" aria-label="삭제">' + icon('trash') + '</button></div>' : '') +
      '</div>';
  }

  /* =====================================================
     홈
     ===================================================== */
  function initHome() {
    var heroEl = $('#latest'), countEl = $('#countdown'), quickEl = $('#quick-games'), mineEl = $('#mine');
    var quick = [], lastDraws = null;
    function rollQuick() { quick = generate(5); quickEl.innerHTML = gamesHTML(quick, true); }
    rollQuick();
    $('#quick-reroll').addEventListener('click', function () { rollQuick(); toast('새 번호 5게임을 뽑았습니다'); });
    $('#quick-save').addEventListener('click', function () { addToVault(quick, '빠른 뽑기'); renderMine(); });
    quickEl.addEventListener('click', function (e) {
      var b = e.target.closest('[data-save]'); if (!b) return;
      addToVault([quick[+b.getAttribute('data-save')]], '빠른 뽑기'); renderMine();
    });

    function renderMine() {
      if (!lastDraws) return;
      var v = loadVault();
      if (!v.length) {
        mineEl.innerHTML = '<p class="muted">아직 저장한 번호가 없어요. 위에서 마음에 드는 번호를 저장하면 추첨 뒤 결과를 여기서 바로 볼 수 있어요.</p>';
        return;
      }
      var checked = 0, wins = 0, waiting = 0;
      var rows = v.map(function (o) { var r = vaultResult(o, lastDraws); if (r.draw) { checked++; if (r.rank) wins++; } else waiting++; return r; });
      mineEl.innerHTML =
        '<div class="tiles"><div class="tile"><span>저장한 게임</span><b class="num">' + v.length + '</b></div>' +
        '<div class="tile"><span>당첨 / 결과 나온 게임</span><b class="num' + (wins ? ' win' : '') + '">' + wins + ' / ' + checked + '</b></div></div>' +
        '<div class="games" style="margin-top:12px">' + rows.slice(0, 3).map(function (r) { return vaultRowHTML(r); }).join('') + '</div>' +
        (waiting ? '<p class="hint" style="margin-top:10px">' + waiting + '게임은 다음 추첨 뒤에 결과가 나와요.</p>' : '');
    }

    loadDraws().then(function (draws) {
      lastDraws = draws;
      var d = draws[draws.length - 1], next = nextDraw(d);
      var first = d.prizes ? d.prizes[0] : d.firstPrize, winners = d.winners ? d.winners[0] : d.firstWinners;
      heroEl.innerHTML =
        '<div class="card-head"><div><p class="card-sub">' + fmtDate(d.date, true) + ' 추첨</p><h2 class="card-title" style="font-size:22px">제 ' + d.round + '회 당첨번호</h2></div>' +
        '<a class="link" href="simulator.html">회차별 조회' + icon('right', 16) + '</a></div>' +
        balls(d.numbers, { bonus: d.bonus, size: 'lg', nowrap: true }) +
        '<div class="hero-meta"><div class="hero-stat"><span>1등 당첨금 (1인)</span><b class="num">' + (first ? won(first) : '-') + '</b></div>' +
        '<div class="hero-stat"><span>1등 당첨자</span><b class="num">' + (winners != null ? winners + '명' : '-') + '</b></div></div>';
      $('#count-title').textContent = '제 ' + next.round + '회 추첨까지';
      $('#count-date').textContent = kstDateText(next.at);
      (function tick() {
        var s = Math.max(0, Math.floor((next.at - Date.now()) / 1000));
        if (!s) { countEl.innerHTML = '<p class="muted" style="grid-column:1/-1">추첨이 끝났어요. 결과는 잠시 뒤 자동으로 반영됩니다.</p>'; return; }
        var parts = [[Math.floor(s / 86400), '일'], [Math.floor(s / 3600) % 24, '시간'], [Math.floor(s / 60) % 60, '분'], [s % 60, '초']];
        countEl.innerHTML = parts.map(function (p) { return '<div><b class="num">' + pad(p[0]) + '</b><span>' + p[1] + '</span></div>'; }).join('');
        setTimeout(tick, 1000 - Date.now() % 1000);
      })();
      renderMine();
    }).catch(function () { loadError(heroEl); countEl.innerHTML = ''; mineEl.innerHTML = ''; });
  }

  /* =====================================================
     번호 생성
     ===================================================== */
  function initGenerate() {
    var MAXF = 5, MAXX = 30;
    var state = {}, mode = 'fix';
    var board = $('#board'), html = '';
    for (var n = 1; n <= 45; n++) html += '<button type="button" data-n="' + n + '">' + ball(n) + '</button>';
    board.innerHTML = html;
    function list(st) { return Object.keys(state).filter(function (k) { return state[k] === st; }).map(Number).sort(byNum); }
    function paint() {
      $$('button', board).forEach(function (b) {
        var st = state[b.getAttribute('data-n')];
        if (st) b.setAttribute('data-state', st); else b.removeAttribute('data-state');
        b.setAttribute('aria-pressed', st ? 'true' : 'false');
        b.setAttribute('aria-label', b.getAttribute('data-n') + '번' + (st === 'fix' ? ', 고정수' : st === 'exc' ? ', 제외수' : ''));
      });
      $('#pick-count').innerHTML = '고정수 <b class="num">' + list('fix').length + '</b>/' + MAXF + ' · 제외수 <b class="num">' + list('exc').length + '</b>/' + MAXX;
    }
    board.addEventListener('click', function (e) {
      var b = e.target.closest('[data-n]'); if (!b) return;
      var n = b.getAttribute('data-n');
      if (state[n] === mode) delete state[n];
      else {
        if (list(mode).length >= (mode === 'fix' ? MAXF : MAXX)) { toast((mode === 'fix' ? '고정수는 최대 ' + MAXF : '제외수는 최대 ' + MAXX) + '개까지 고를 수 있습니다'); return; }
        state[n] = mode;
      }
      paint();
    });
    $$('#mode button').forEach(function (b) {
      b.addEventListener('click', function () {
        mode = b.getAttribute('data-mode');
        $$('#mode button').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      });
    });
    $('#reset').addEventListener('click', function () { state = {}; paint(); toast('고른 번호를 모두 지웠습니다'); });
    paint();

    // 조건
    $$('#odd .chip').forEach(function (c) {
      c.addEventListener('click', function () { c.setAttribute('aria-pressed', c.getAttribute('aria-pressed') === 'true' ? 'false' : 'true'); });
    });
    $$('.switch').forEach(function (s) {
      s.addEventListener('click', function () {
        var on = s.getAttribute('aria-checked') !== 'true';
        s.setAttribute('aria-checked', on ? 'true' : 'false');
        var tgt = s.getAttribute('data-reveal'); if (tgt) $(tgt).hidden = !on;
      });
    });
    var games = 5;
    $$('#games button').forEach(function (b) {
      b.addEventListener('click', function () {
        games = +b.getAttribute('data-g');
        $$('#games button').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        $('#gen-label').textContent = games + '게임 생성하기';
      });
    });
    function on(id) { return $(id).getAttribute('aria-checked') === 'true'; }

    var lastDraw = null;
    loadDraws().then(function (draws) {
      lastDraw = draws[draws.length - 1];
      $('#last-nums').textContent = lastDraw.round + '회 번호 ' + lastDraw.numbers.join(', ') + '을(를) 빼고 뽑아요';
    }).catch(function () { $('#last-nums').textContent = '데이터를 불러오지 못해 쓸 수 없어요'; });

    var result = [];
    $('#gen-btn').addEventListener('click', function () {
      var excluded = list('exc');
      if (on('#sw-last') && lastDraw) lastDraw.numbers.forEach(function (n) { if (excluded.indexOf(n) < 0 && state[n] !== 'fix') excluded.push(n); });
      var opt = {
        fixed: list('fix'), excluded: excluded,
        odd: $$('#odd .chip[aria-pressed="true"]').map(function (c) { return +c.getAttribute('data-odd'); }),
        noRun3: on('#sw-run'), noSameEnd3: on('#sw-end')
      };
      if (on('#sw-sum')) {
        var a = parseInt($('#sum-min').value, 10), b = parseInt($('#sum-max').value, 10);
        if (isNaN(a) || isNaN(b) || a > b) { toast('합계 범위를 확인해 주세요 (최소 ≤ 최대)'); return; }
        opt.sumMin = a; opt.sumMax = b;
      }
      result = generate(games, opt);
      var box = $('#result');
      box.hidden = false;
      $('#result-games').innerHTML = !result.length
        ? '<p class="muted">조건을 모두 만족하는 조합을 찾지 못했어요. 고정수·제외수나 조건을 조금 풀어 보세요.</p>'
        : gamesHTML(result, true) + (result.length < games ? '<p class="hint">조건이 까다로워 ' + result.length + '게임만 만들었어요.</p>' : '');
      $('#result-actions').hidden = !result.length;
      box.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    $('#result-games').addEventListener('click', function (e) {
      var b = e.target.closest('[data-save]'); if (b) addToVault([result[+b.getAttribute('data-save')]], '번호 생성');
    });
    $('#save-all').addEventListener('click', function () { if (result.length) addToVault(result, '번호 생성'); });
    $('#copy-all').addEventListener('click', function () { if (result.length) copySets(result); });
  }

  /* =====================================================
     통계
     ===================================================== */
  var ZONES = [[1, 10, '1~10', 'y'], [11, 20, '11~20', 'b'], [21, 30, '21~30', 'r'], [31, 40, '31~40', 'g'], [41, 45, '41~45', 'n']];
  function vbarsHTML(items, total) {
    var max = Math.max.apply(null, items.map(function (x) { return x[1]; })) || 1;
    return '<div class="vbars' + (items.length > 8 ? ' dense' : '') + '">' + items.map(function (x) {
      return '<div class="vbar' + (x[1] === max ? ' top' : '') + '"><em class="num">' + pct(x[1], total, 0) + '</em>' +
        '<i style="height:' + (x[1] / max * 66).toFixed(1) + '%"></i><span>' + x[0] + '</span></div>';
    }).join('') + '</div>';
  }
  function barsHTML(items, total, scale) {
    var max = scale || Math.max.apply(null, items.map(function (x) { return x[1]; })) || 1;
    var top = Math.max.apply(null, items.map(function (x) { return x[1]; }));
    return '<div class="bars">' + items.map(function (x) {
      return '<div class="bar-row' + (x[1] === top ? ' top' : '') + '"><span class="lbl">' + x[0] + '</span>' +
        '<div class="bar-track"><div class="bar-fill" style="width:' + Math.min(100, x[1] / max * 100).toFixed(1) + '%"></div></div>' +
        '<span class="val num">' + pct(x[1], total, 0) + '</span></div>';
    }).join('') + '</div>';
  }
  function initStats() {
    var root = $('#stats-body');
    loadDraws().then(function (draws) {
      var latest = draws[draws.length - 1].round, period = 100, rankMode = 'hot', selected = null;
      var lastSeen = {};
      draws.forEach(function (d) { d.numbers.forEach(function (n) { lastSeen[n] = d.round; }); });
      $('#stats-base').textContent = '1~' + latest + '회 데이터';

      function render() {
        var w = period ? draws.slice(-period) : draws, total = w.length, n;
        var freq = {};
        for (n = 1; n <= 45; n++) freq[n] = 0;
        var odd = [0, 0, 0, 0, 0, 0, 0], sums = [0, 0, 0, 0, 0, 0], cons = [0, 0, 0], zones = [0, 0, 0, 0, 0], ends = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        w.forEach(function (d) {
          d.numbers.forEach(function (x) {
            freq[x]++; ends[x % 10]++;
            ZONES.forEach(function (z, i) { if (x >= z[0] && x <= z[1]) zones[i]++; });
          });
          odd[oddCount(d.numbers)]++;
          var s = sum(d.numbers);
          sums[s < 100 ? 0 : s < 120 ? 1 : s < 140 ? 2 : s < 160 ? 3 : s < 180 ? 4 : 5]++;
          cons[Math.min(2, consecutivePairs(d.numbers))]++;
        });
        var balls6 = total * 6, maxF = 0, minF = Infinity;
        for (n = 1; n <= 45; n++) { maxF = Math.max(maxF, freq[n]); minF = Math.min(minF, freq[n]); }
        if (selected == null) selected = +Object.keys(freq).sort(function (a, b) { return freq[b] - freq[a]; })[0];

        // 번호별 출현 지도 (한 가지 색의 진하기 = 출현 횟수)
        var heat = '';
        for (n = 1; n <= 45; n++) {
          var t = maxF > minF ? (freq[n] - minF) / (maxF - minF) : 0, mix = Math.round(6 + t * 94);
          heat += '<button type="button" data-n="' + n + '" aria-pressed="' + (n === selected) + '" aria-label="' + n + '번, ' + freq[n] + '회 출현"' +
            ' style="background:color-mix(in srgb, var(--heat-1) ' + mix + '%, var(--heat-0));' + (mix > 55 ? 'color:#fff' : '') + '">' + n + '</button>';
        }
        var gap = latest - (lastSeen[selected] || 0);
        var sec = [];
        sec.push('<section class="card"><div class="card-head"><div><h2 class="card-title">번호별 출현 횟수</h2><p class="card-sub">진할수록 많이 나온 번호예요. 번호를 눌러 자세히 보세요.</p></div></div>' +
          '<div class="heat">' + heat + '</div>' +
          '<div class="heat-scale"><span class="num">' + minF + '회</span><i></i><span class="num">' + maxF + '회</span></div>' +
          '<div class="detail" aria-live="polite">' + ball(selected) + '<div><b>' + selected + '번 · ' + freq[selected] + '회 출현</b><br><span class="muted">' + total + '회 중 ' + pct(freq[selected], total) +
          ' · ' + (gap ? '마지막 출현 ' + lastSeen[selected] + '회 (' + gap + '회 전)' : '지난 회차에 나왔어요') + '</span></div></div></section>');

        // 순위
        var nums = Object.keys(freq).map(Number), rows;
        if (rankMode === 'hot') rows = nums.sort(function (a, b) { return freq[b] - freq[a] || a - b; }).slice(0, 5)
          .map(function (x) { return [x, freq[x] + '회 출현', freq[x], pct(freq[x], total)]; });
        else rows = nums.map(function (x) { return [x, latest - (lastSeen[x] || 0)]; }).sort(function (a, b) { return b[1] - a[1] || a[0] - b[0]; }).slice(0, 5)
          .map(function (x) { return [x[0], x[1] + '회째 안 나옴', x[1], lastSeen[x[0]] + '회'] ; });
        var rmax = rows[0][2] || 1;
        sec.push('<section class="card"><div class="card-head"><h2 class="card-title">번호 순위 TOP 5</h2></div>' +
          '<div class="seg" id="rank-seg" role="group" aria-label="순위 기준"><button type="button" data-r="hot" aria-pressed="' + (rankMode === 'hot') + '">많이 나온 번호</button>' +
          '<button type="button" data-r="cold" aria-pressed="' + (rankMode === 'cold') + '">오래 안 나온 번호</button></div>' +
          '<ol class="rank" style="margin-top:14px">' + rows.map(function (r) {
            return '<li>' + ball(r[0], 'sm') + '<div class="info"><b>' + r[0] + '번</b> <small style="display:inline">· ' + r[1] + '</small>' +
              '<div class="bar-track"><div class="bar-fill" style="width:' + (r[2] / rmax * 100).toFixed(1) + '%"></div></div></div><span class="muted num">' + r[3] + '</span></li>';
          }).join('') + '</ol>' +
          (rankMode === 'cold' ? '<p class="hint" style="margin-top:12px">오래 안 나온 번호는 기간 선택과 상관없이 전체 회차 기준이에요. 오른쪽은 마지막으로 나온 회차예요.</p>' : '') + '</section>');

        // 번호대별 비중 (막대 길이 = 비율, 최대 30% 눈금)
        sec.push('<section class="card"><div class="card-head"><div><h2 class="card-title">번호대별 비중</h2><p class="card-sub">공 색깔 구간마다 나온 번호의 비율</p></div></div>' +
          barsHTML(ZONES.map(function (z, i) {
            return ['<span class="ball ' + z[3] + '" style="--s:12px;font-size:0;vertical-align:-1px;margin-right:6px"></span>' + z[2], zones[i]];
          }), balls6, balls6 * 0.3) +
          '<p class="hint" style="margin-top:10px">완전히 무작위라면 1~40은 각 22.2%, 41~45는 11.1%가 기대값이에요.</p></section>');

        sec.push('<section class="card"><div class="card-head"><div><h2 class="card-title">홀짝 비율</h2><p class="card-sub">한 회차의 홀수:짝수 개수별 비율</p></div></div>' +
          vbarsHTML(odd.map(function (c, i) { return [i + ':' + (6 - i), c]; }), total) + '</section>');
        sec.push('<section class="card"><div class="card-head"><div><h2 class="card-title">번호 합계 분포</h2><p class="card-sub">당첨번호 6개를 더한 값</p></div></div>' +
          vbarsHTML([['~99', sums[0]], ['100~', sums[1]], ['120~', sums[2]], ['140~', sums[3]], ['160~', sums[4]], ['180~', sums[5]]], total) + '</section>');
        sec.push('<section class="card"><div class="card-head"><div><h2 class="card-title">연속 번호</h2><p class="card-sub">12·13처럼 이어지는 번호가 있었던 회차</p></div></div>' +
          barsHTML([['없음', cons[0]], ['1쌍', cons[1]], ['2쌍 이상', cons[2]]], total) + '</section>');
        sec.push('<section class="card"><div class="card-head"><div><h2 class="card-title">끝자리 분포</h2><p class="card-sub">당첨번호의 일의 자리별 비율</p></div></div>' +
          vbarsHTML(ends.map(function (c, i) { return [String(i), c]; }), balls6) + '</section>');
        root.innerHTML = sec.join('');

        $$('#rank-seg button', root).forEach(function (b) { b.addEventListener('click', function () { rankMode = b.getAttribute('data-r'); render(); }); });
        $$('.heat button', root).forEach(function (b) {
          b.addEventListener('click', function () { selected = +b.getAttribute('data-n'); render(); var f = $('.heat button[data-n="' + selected + '"]', root); if (f) f.focus(); });
        });
      }
      $$('#period button').forEach(function (b) {
        b.addEventListener('click', function () {
          period = +b.getAttribute('data-p');
          $$('#period button').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
          render();
        });
      });
      render();
    }).catch(function () { loadError(root); });
  }

  /* =====================================================
     당첨 조회 (회차별 결과 + 내 번호 맞춰보기)
     ===================================================== */
  function initCheck() {
    var draws = [], cur = 0;
    function showTab(name) {
      $$('#check-tabs button').forEach(function (b) { b.setAttribute('aria-selected', b.getAttribute('data-tab') === name ? 'true' : 'false'); });
      $('#tab-round').hidden = name !== 'round';
      $('#tab-mine').hidden = name !== 'mine';
      try { history.replaceState(null, '', name === 'mine' ? '#mine' : location.pathname); } catch (e) {}
    }
    $$('#check-tabs button').forEach(function (b) { b.addEventListener('click', function () { showTab(b.getAttribute('data-tab')); }); });
    showTab(location.hash === '#mine' ? 'mine' : 'round');

    // 회차별 결과
    function renderRound() {
      var d = draws[cur];
      $('#round-input').value = d.round;
      $('#prev-round').disabled = cur === 0;
      $('#next-round').disabled = cur === draws.length - 1;
      var rows = [1, 2, 3, 4, 5].map(function (r) {
        var cond = ['6개 일치', '5개+보너스', '5개 일치', '4개 일치', '3개 일치'][r - 1];
        var amt = d.prizes ? d.prizes[r - 1] : r === 1 ? d.firstPrize : null, cnt = d.winners ? d.winners[r - 1] : r === 1 ? d.firstWinners : null;
        return '<tr><td><b>' + r + '등</b><br><span class="muted">' + cond + '</span></td><td class="num prize">' + (amt != null ? comma(amt) + '원' : '-') + '</td><td class="num">' + (cnt != null ? comma(cnt) + '명' : '-') + '</td></tr>';
      }).join('');
      $('#round-card').innerHTML =
        '<div class="card-head"><div><p class="card-sub">' + fmtDate(d.date, true) + ' 추첨</p><h2 class="card-title" style="font-size:20px">제 ' + d.round + '회</h2></div>' +
        (cur === draws.length - 1 ? '<span class="badge wait">최신 회차</span>' : '') + '</div>' +
        balls(d.numbers, { bonus: d.bonus, nowrap: true }) +
        '<table class="table" style="margin-top:16px"><thead><tr><th>등수</th><th>1인당 당첨금</th><th>당첨자</th></tr></thead><tbody>' + rows + '</tbody></table>' +
        '<p class="muted" style="margin-top:10px">총 판매액 <span class="num">' + won(d.totalSales) + '</span></p>';
      $('#recent').innerHTML = draws.slice(Math.max(0, draws.length - 10)).reverse().map(function (x, i) {
        var idx = draws.length - 1 - i;
        return '<button type="button" class="draw-item" data-i="' + idx + '"' + (idx === cur ? ' aria-current="true"' : '') + '><span class="rd"><b class="num">' + x.round + '회</b><small class="num">' + x.date.slice(5).replace('-', '.') + '</small></span>' +
          balls(x.numbers, { size: 'sm', nowrap: true }) + '</button>';
      }).join('');
    }
    function go(i) { cur = Math.max(0, Math.min(draws.length - 1, i)); renderRound(); }
    $('#prev-round').addEventListener('click', function () { go(cur - 1); });
    $('#next-round').addEventListener('click', function () { go(cur + 1); });
    $('#round-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var r = parseInt($('#round-input').value, 10);
      if (!(r >= 1 && r <= draws.length)) { toast('1~' + draws.length + '회 사이로 입력해 주세요'); return; }
      go(r - 1);
    });
    $('#recent').addEventListener('click', function (e) {
      var b = e.target.closest('[data-i]'); if (!b) return;
      go(+b.getAttribute('data-i')); $('#round-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    // 내 번호 맞춰보기
    var picked = [], board = $('#pick-board'), html = '';
    for (var n = 1; n <= 45; n++) html += '<button type="button" data-n="' + n + '" aria-pressed="false" aria-label="' + n + '번">' + ball(n) + '</button>';
    board.innerHTML = html;
    function paintPick() {
      $$('button', board).forEach(function (b) {
        var on = picked.indexOf(+b.getAttribute('data-n')) >= 0;
        if (on) b.setAttribute('data-state', 'pick'); else b.removeAttribute('data-state');
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      board.classList.toggle('board-dim', picked.length === 6);
      $('#pick-status').textContent = picked.length === 6 ? '6개를 모두 골랐어요' : picked.length + ' / 6개 선택';
      $('#run-check').disabled = picked.length !== 6;
    }
    board.addEventListener('click', function (e) {
      var b = e.target.closest('[data-n]'); if (!b) return;
      var x = +b.getAttribute('data-n'), i = picked.indexOf(x);
      if (i >= 0) picked.splice(i, 1);
      else if (picked.length < 6) picked.push(x);
      else { toast('6개까지 고를 수 있어요. 바꿀 번호를 먼저 눌러 빼 주세요'); return; }
      paintPick();
    });
    $('#pick-random').addEventListener('click', function () { picked = generate(1)[0]; paintPick(); });
    $('#pick-clear').addEventListener('click', function () { picked = []; paintPick(); $('#check-result').hidden = true; });
    var vault = loadVault(), sel = $('#pick-vault');
    if (vault.length) {
      sel.innerHTML = '<option value="">보관함에서 불러오기 (' + vault.length + '개)</option>' + vault.map(function (o, i) {
        return '<option value="' + i + '">' + o.nums.map(pad).join(' ') + (o.label ? ' · ' + esc(o.label) : '') + '</option>';
      }).join('');
      sel.addEventListener('change', function () { if (sel.value !== '') { picked = vault[+sel.value].nums.slice(); paintPick(); } });
    } else sel.hidden = true;
    paintPick();

    $('#run-check').addEventListener('click', function () {
      var nums = picked.slice().sort(byNum), counts = [0, 0, 0, 0, 0, 0], prize = 0, best = null, hasAll = true;
      draws.forEach(function (d) {
        var r = rankOf(nums, d);
        counts[r]++;
        if (r) {
          prize += prizeOf(r, d);
          if (!d.prizes && (r === 2 || r === 3)) hasAll = false;
          if (!best || r < best.rank || (r === best.rank && d.round > best.d.round)) best = { rank: r, d: d };
        }
      });
      var spent = draws.length * 1000, rate = prize / spent * 100, box = $('#check-result');
      box.hidden = false;
      box.innerHTML =
        '<div class="card-head"><div><h2 class="card-title">1~' + draws.length + '회 전체에 맞춰본 결과</h2><p class="card-sub">매주 같은 번호로 1게임(1,000원)씩 샀다고 가정</p></div></div>' +
        balls(nums, { nowrap: true }) +
        '<div class="tiles" style="margin-top:14px">' +
        '<div class="tile"><span>총 구입액</span><b class="num">' + won(spent) + '</b></div>' +
        '<div class="tile"><span>총 당첨금</span><b class="num prize">' + won(prize) + '</b></div>' +
        '<div class="tile"><span>회수율</span><b class="num ' + (rate >= 100 ? 'win' : 'loss') + '">' + rate.toLocaleString('ko-KR', { maximumFractionDigits: 1 }) + '%</b></div>' +
        '<div class="tile"><span>당첨 횟수</span><b class="num">' + (draws.length - counts[0]) + '회</b></div></div>' +
        '<table class="table" style="margin-top:14px"><thead><tr><th>등수</th><th>횟수</th></tr></thead><tbody>' +
        [1, 2, 3, 4, 5].map(function (r) { return '<tr><td>' + r + '등</td><td class="num">' + counts[r] + '회</td></tr>'; }).join('') +
        '<tr><td>낙첨</td><td class="num">' + counts[0] + '회</td></tr></tbody></table>' +
        (best ? '<hr class="divider"><p class="group-label" style="margin-top:0">가장 좋은 기록 · ' + best.d.round + '회 ' + RANK_TEXT[best.rank] + '</p>' +
          balls(best.d.numbers, { bonus: best.d.bonus, size: 'sm', nowrap: true, hits: hitsOf(nums, best.d) }) +
          '<p class="hint" style="margin-top:6px">' + fmtDate(best.d.date) + ' 추첨 · 당첨금 ' + comma(prizeOf(best.rank, best.d)) + '원</p>'
          : '<p class="muted" style="margin-top:12px">3개 이상 맞은 회차가 한 번도 없어요.</p>') +
        (hasAll ? '' : '<p class="hint" style="margin-top:8px">일부 회차는 2·3등 당첨금 정보가 없어 합계에서 빠졌어요.</p>') +
        '<div class="btn-row" style="margin-top:14px"><button class="btn btn-secondary" type="button" id="save-checked">' + icon('save') + '이 번호 저장</button></div>';
      $('#save-checked').addEventListener('click', function () { addToVault([nums], '당첨 조회'); });
      box.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    loadDraws().then(function (d) { draws = d; go(d.length - 1); $('#all-count').textContent = d.length; })
      .catch(function () { loadError($('#round-card')); });
  }

  /* =====================================================
     보관함
     ===================================================== */
  function initVault() {
    var listEl = $('#vault-list'), draws = null;
    function draw() {
      var v = loadVault();
      $('#vault-empty').hidden = v.length > 0;
      $('#vault-tools').hidden = !v.length;
      $('#vault-count').textContent = v.length + '게임';
      if (!v.length) { listEl.innerHTML = ''; return; }
      if (!draws) { listEl.innerHTML = '<div class="skeleton" style="height:140px"></div>'; return; }
      var rows = v.map(function (o) { return vaultResult(o, draws); });
      var wins = rows.filter(function (r) { return r.rank; }).length, checked = rows.filter(function (r) { return r.draw; }).length;
      $('#vault-summary').textContent = checked ? '결과가 나온 ' + checked + '게임 중 ' + wins + '게임 당첨' : '아직 결과가 나온 게임이 없어요';
      listEl.innerHTML = '<div class="games">' + rows.map(function (r, i) { return vaultRowHTML(r, i, true); }).join('') + '</div>';
    }
    listEl.addEventListener('click', function (e) {
      var v = loadVault(), c = e.target.closest('[data-copy]'), d = e.target.closest('[data-del]');
      if (c) copySets([v[+c.getAttribute('data-copy')].nums]);
      if (d) { v.splice(+d.getAttribute('data-del'), 1); saveVault(v); draw(); toast('삭제했습니다'); }
    });
    $('#vault-clear').addEventListener('click', function () {
      if (window.confirm('저장한 번호를 모두 지울까요? 되돌릴 수 없습니다.')) { saveVault([]); draw(); toast('모두 지웠습니다'); }
    });
    $('#vault-copy').addEventListener('click', function () { copySets(loadVault().map(function (o) { return o.nums; })); });
    draw();
    loadDraws().then(function (d) { draws = d; draw(); })
      .catch(function () { listEl.innerHTML = '<p class="muted">당첨 데이터를 불러오지 못해 결과를 확인할 수 없어요.</p>'; });
  }

  /* ---------- 시작 ---------- */
  initShell();
  if (page === 'index') initHome();
  if (page === 'combiner') initGenerate();
  if (page === 'stats') initStats();
  if (page === 'simulator') initCheck();
  if (page === 'vault') initVault();
})();
