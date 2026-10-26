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
    return comma(n) + '원';                 // 1억 미만은 반올림하지 않고 그대로 (예: 146,000원)
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
    qr: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 17h4v4h-4"/>',
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

  /* 보관함 (이 기기의 localStorage). 가득 차면 새로 넣지 않고 알립니다(예전 번호를 몰래 지우지 않음). */
  var VAULT_MAX = 500;
  function loadVault() { try { return JSON.parse(localStorage.getItem(VAULT_KEY)) || []; } catch { return []; } }
  function saveVault(list) { try { localStorage.setItem(VAULT_KEY, JSON.stringify(list)); return true; } catch { return false; } }
  // round를 주면 그 회차 용지로 저장합니다(QR 용지). 없으면 저장 뒤 첫 추첨이 대상입니다.
  function addToVault(sets, label, round) {
    var v = loadVault(), t = new Date().toISOString();
    if (v.length + sets.length > VAULT_MAX) {
      toast('보관함이 가득 찼어요(최대 ' + VAULT_MAX + '게임). 백업한 뒤 오래된 번호를 지워 주세요');
      return false;
    }
    sets.slice().reverse().forEach(function (s) {
      var o = { nums: s.slice().sort(byNum), label: label || '', at: t };
      if (round) o.round = round;
      v.unshift(o);
    });
    if (saveVault(v)) { toast('보관함에 ' + sets.length + '게임을 저장했습니다'); return true; }
    toast('저장 공간을 사용할 수 없습니다');
    return false;
  }

  /* 보관함 백업·옮기기
     - 파일: {app:'lottolab', version:1, exportedAt, items:[보관함 항목]} 형식의 JSON
     - 링크: vault.html#import=<짧게 줄인 항목을 base64url로 바꾼 값>. 링크를 열면 미리 보고 넣을지 묻습니다.
     - 가져올 때는 번호·회차·저장 시각이 같은 항목을 중복으로 보고 건너뜁니다. */
  var BACKUP_KEY = 'lottolab.lastBackup';
  // 바깥에서 들어온 항목을 검사해 보관함 형식으로 맞춥니다. 잘못된 항목은 null.
  function cleanItem(o) {
    if (!o || !Array.isArray(o.nums) || o.nums.length !== 6) return null;
    var nums = o.nums.map(Number);
    if (!nums.every(function (n) { return n >= 1 && n <= 45 && n % 1 === 0; }) || nums.filter(function (n, i) { return nums.indexOf(n) === i; }).length !== 6) return null;
    var at = new Date(o.at);
    // 저장 시각은 로또 시작(2002-12) 이후 ~ 지금(+하루 여유)까지만. 미래 시각으로 내 번호를 밀어내는 링크를 막습니다.
    if (isNaN(at) || at < new Date('2002-12-01T00:00:00Z') || at.getTime() > Date.now() + DAY) return null;
    var c = { nums: nums.sort(byNum), label: String(o.label || '').slice(0, 40), at: at.toISOString() };
    if (o.weekly) c.weekly = true;
    if (o.round && +o.round > 0 && +o.round % 1 === 0) c.round = +o.round;
    return c;
  }
  function itemKey(o) { return o.nums.join(',') + '|' + (o.round || '') + '|' + o.at; }
  // items를 보관함에 합칩니다. 있던 항목은 그대로 두고, 자리가 없으면 넣지 않습니다. 결과: {added, dup, bad, full, failed}
  function mergeVault(items) {
    var v = loadVault(), keys = {}, res = { added: 0, dup: 0, bad: 0, full: 0, failed: false };
    v.forEach(function (o) { keys[itemKey(o)] = 1; });
    (items || []).forEach(function (raw) {
      var o = cleanItem(raw);
      if (!o) { res.bad++; return; }
      if (keys[itemKey(o)]) { res.dup++; return; }
      if (v.length >= VAULT_MAX) { res.full++; return; }
      keys[itemKey(o)] = 1; v.push(o); res.added++;
    });
    v.sort(function (a, b) { return Date.parse(b.at) - Date.parse(a.at); });   // 최근에 저장한 번호가 위
    if (res.added && !saveVault(v)) { res.failed = true; res.added = 0; }
    return res;
  }
  function b64urlEncode(str) { return btoa(unescape(encodeURIComponent(str))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function b64urlDecode(str) { str = str.replace(/-/g, '+').replace(/_/g, '/'); while (str.length % 4) str += '='; return decodeURIComponent(escape(atob(str))); }
  // 링크에는 항목을 짧게 줄여 담습니다: n=번호 12자리, t=저장 시각(초), l=이름, w=매주 구매, r=회차
  function vaultLink(list) {
    var short = list.map(function (o) {
      var x = { n: o.nums.map(pad).join(''), t: Math.round(Date.parse(o.at) / 1000) };
      if (o.label) x.l = o.label;
      if (o.weekly) x.w = 1;
      if (o.round) x.r = o.round;
      return x;
    });
    return location.href.replace(/[^/]*([?#].*)?$/, '') + 'vault.html#import=' + b64urlEncode(JSON.stringify({ v: 1, i: short }));
  }
  function readVaultLink(hash) {
    var m = /#import=([A-Za-z0-9_-]+)/.exec(hash || '');
    if (!m) return null;
    try {
      var data = JSON.parse(b64urlDecode(m[1]));
      return (data.i || []).map(function (x) {
        var nums = []; for (var k = 0; k < 12; k += 2) nums.push(parseInt(String(x.n).substr(k, 2), 10));
        return { nums: nums, at: new Date(x.t * 1000).toISOString(), label: x.l, weekly: !!x.w, round: x.r };
      }).map(cleanItem).filter(Boolean);
    } catch { return []; }
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
  // ms 시각 뒤에 열리는 첫 추첨 {round, at}. 마지막으로 수집한 회차부터 7일씩 세어 갑니다.
  function drawAfter(last, ms) {
    var at = drawAt(last), round = last.round;
    while (at <= ms) { at += 7 * DAY; round++; }
    return { round: round, at: at };
  }
  // 다음 추첨: 지금 이후 첫 추첨
  function nextDraw(last) { return drawAfter(last, Date.now()); }
  // 추첨은 끝났지만 아직 수집되지 않은 회차(예: 토요일 밤~수집 전). 없으면 null
  function pendingDraw(last) { return nextDraw(last).round > last.round + 1 ? { round: last.round + 1, at: drawAt(last) + 7 * DAY } : null; }
  // round 회차의 추첨 시각 (마지막 수집 회차 기준)
  function roundAt(last, round) { return drawAt(last) + (round - last.round) * 7 * DAY; }
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

  /* 내 번호 6개와 가장 많이 맞은 회차 찾기
     1) 모든 회차의 당첨번호 6개(보너스 제외)와 비교해 맞은 개수를 셉니다.
     2) 3개 이상 맞은 회차만 남깁니다. (3개 미만은 5등에도 들지 못함)
     3) 맞은 개수가 많은 순 → 같으면 보너스 번호까지 맞은 회차(5개+보너스는 2등) → 같으면 최근 회차 순으로 줄 세워 앞의 limit개를 고릅니다.
     4) 고른 회차를 회차 번호 내림차순(최신 회차가 위)으로 돌려줍니다.
     summary에는 3·4·5·6개 맞은 회차가 각각 몇 번인지 담습니다. */
  function findBestMatches(nums, draws, limit, min) {
    limit = limit || 5; min = min || 3;
    var summary = { 3: 0, 4: 0, 5: 0, 6: 0 }, hits = [];
    draws.forEach(function (d) {
      var matched = nums.filter(function (n) { return d.numbers.indexOf(n) >= 0; });
      if (matched.length < min) return;
      summary[matched.length]++;
      hits.push({ draw: d, matched: matched, count: matched.length, bonus: nums.indexOf(d.bonus) >= 0, rank: rankOf(nums, d) });
    });
    hits.sort(function (a, b) { return b.count - a.count || (b.bonus - a.bonus) || b.draw.round - a.draw.round; });
    var top = hits.slice(0, limit).sort(function (a, b) { return b.draw.round - a.draw.round; });
    return { top: top, total: hits.length, summary: summary };
  }

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
  function themePref() { try { return localStorage.getItem(THEME_KEY) || 'system'; } catch { return 'system'; } }
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
        try { if (next === 'system') localStorage.removeItem(THEME_KEY); else localStorage.setItem(THEME_KEY, next); } catch {}
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
      var last = draws[draws.length - 1], next = nextDraw(last), pend = pendingDraw(last), days = kstDay(next.at) - kstDay(Date.now());
      $('#next-sub').innerHTML = pend ? '제 <b>' + pend.round + '회</b> 결과 수집 중'
        : '제 <b>' + next.round + '회</b> 추첨 ' + (days === 0 ? '오늘 저녁' : 'D-' + days);
    }).catch(function () { $('#next-sub').textContent = '당첨 데이터를 불러오지 못했습니다'; });
  }

  /* 화면 안의 탭: role="tablist"의 버튼(data-tab)과 #tab-<이름> 패널을 묶습니다.
     주소 끝의 #이름으로 바로 열 수 있고(홈의 기능 지도에서 씀), 탭을 바꾸면 주소도 바뀝니다. 첫 탭은 # 없이. */
  function setupTabs(listSel, onChange) {
    var btns = $$(listSel + ' [data-tab]'), names = btns.map(function (b) { return b.getAttribute('data-tab'); });
    function show(name, fromUser) {
      if (names.indexOf(name) < 0) name = names[0];
      btns.forEach(function (b) { b.setAttribute('aria-selected', b.getAttribute('data-tab') === name ? 'true' : 'false'); });
      names.forEach(function (n) { var p = $('#tab-' + n); if (p) p.hidden = n !== name; });
      if (fromUser) { try { history.replaceState(null, '', name === names[0] ? location.pathname : '#' + name); } catch (e) { /* 무시 */ } }
      if (onChange) onChange(name);
    }
    btns.forEach(function (b) { b.addEventListener('click', function () { show(b.getAttribute('data-tab'), true); }); });
    window.addEventListener('hashchange', function () { show(location.hash.slice(1)); });
    show(location.hash.slice(1));
    return show;
  }

  // 데이터를 못 읽었을 때 본문에 보여 줄 안내
  function loadError(el) {
    if (el) el.innerHTML = '<div class="empty"><b>당첨 데이터를 불러오지 못했어요</b><p>인터넷 연결을 확인한 뒤 새로고침해 주세요.</p><button class="btn btn-secondary" type="button" onclick="location.reload()">새로고침</button></div>';
  }

  /* =====================================================
     번호 생성 엔진 (홈 빠른 뽑기 + 번호 생성 화면)
     ===================================================== */
  // opt: fixed[], excluded[], odd[] (허용하는 홀수 개수), sumMin, sumMax,
  //      runMin (이 개수 이상 연속이면 뺌), endMin (같은 끝자리가 이 개수 이상이면 뺌)
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
      if (opt.runMin && longestRun(s) >= opt.runMin) continue;
      if (opt.endMin && sameEndMax(s) >= opt.endMin) continue;
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
     번호 6개 고르기 판 (당첨 조회 + 통계의 "가장 많이 맞은 회차")
     ===================================================== */
  // board 요소에 1~45 번호를 그리고, 누를 때마다 고른 번호(최대 6개)를 onChange로 알려 줍니다.
  function makePicker(board, onChange) {
    var picked = [], html = '';
    for (var n = 1; n <= 45; n++) html += '<button type="button" data-n="' + n + '" aria-pressed="false" aria-label="' + n + '번">' + ball(n) + '</button>';
    board.innerHTML = html;
    function paint() {
      $$('button', board).forEach(function (b) {
        var on = picked.indexOf(+b.getAttribute('data-n')) >= 0;
        if (on) b.setAttribute('data-state', 'pick'); else b.removeAttribute('data-state');
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      board.classList.toggle('board-dim', picked.length === 6);   // 6개를 다 고르면 나머지를 흐리게
      onChange(picked.slice().sort(byNum));
    }
    board.addEventListener('click', function (e) {
      var b = e.target.closest('[data-n]'); if (!b) return;
      var x = +b.getAttribute('data-n'), i = picked.indexOf(x);
      if (i >= 0) picked.splice(i, 1);                 // 고른 번호를 다시 누르면 빠짐
      else if (picked.length < 6) picked.push(x);
      else { toast('6개까지 고를 수 있어요. 바꿀 번호를 먼저 눌러 빼 주세요'); return; }
      paint();
    });
    paint();
    return {
      get: function () { return picked.slice().sort(byNum); },
      set: function (nums) { picked = nums.slice(0, 6); paint(); }
    };
  }

  /* =====================================================
     로또 용지 QR (당첨 조회 > 용지 QR)
     ===================================================== */
  /* 용지 QR에는 동행복권 주소가 들어 있습니다.
       예) https://www.dhlottery.co.kr/qr.do?method=winQr&v=1242q020423242538q020607123941
     v= 뒤의 앞 4자리가 회차(1242), 그 뒤로 게임마다 영문 1자(q·m·s 등, 자동/수동 구분) + 두 자리 번호 6개(12자리)가 이어집니다.
     맨 끝에 용지 고유번호 숫자가 더 붙어 있어도 게임마다 12자리만 읽으므로 무시됩니다. */
  function parseTicket(text) {
    var m = String(text || '').match(/[?&]v=([0-9a-z]+)/i);
    if (!m) return null;
    var v = m[1], round = parseInt(v.slice(0, 4), 10);
    if (!(round > 0)) return null;
    var games = [], re = /[a-z](\d{12})/gi, g;
    while ((g = re.exec(v.slice(4))) && games.length < 5) {
      var nums = [];
      for (var i = 0; i < 12; i += 2) nums.push(parseInt(g[1].substr(i, 2), 10));
      var ok = nums.every(function (n) { return n >= 1 && n <= 45; }) && nums.filter(function (n, k) { return nums.indexOf(n) === k; }).length === 6;
      if (ok) games.push(nums.sort(byNum));
    }
    return games.length ? { round: round, games: games } : null;
  }
  // QR 읽기: 브라우저에 내장된 BarcodeDetector가 있으면 쓰고, 없으면 jsQR(js/vendor)을 그때 불러옵니다.
  var jsQRPromise;
  function loadJsQR() {
    if (window.jsQR) return Promise.resolve(window.jsQR);
    if (!jsQRPromise) jsQRPromise = new Promise(function (ok, fail) {
      var sc = document.createElement('script');
      sc.src = 'js/vendor/jsQR.min.js';
      sc.onload = function () { window.jsQR ? ok(window.jsQR) : fail(new Error('jsQR')); };
      sc.onerror = function () { jsQRPromise = null; fail(new Error('jsQR')); };
      document.head.appendChild(sc);
    });
    return jsQRPromise;
  }
  var detector = null;
  try { if ('BarcodeDetector' in window) detector = new window.BarcodeDetector({ formats: ['qr_code'] }); } catch { detector = null; }
  // source(video·img·canvas)에서 QR 글자를 읽어 돌려줍니다. 못 찾으면 null.
  function readQR(source, w, h, canvas) {
    if (detector) {
      return detector.detect(source).then(function (r) { return r.length ? r[0].rawValue : null; }, function () { detector = null; return readQR(source, w, h, canvas); });
    }
    return loadJsQR().then(function (jsQR) {
      var scale = Math.min(1, 800 / Math.max(w, h));
      canvas.width = Math.round(w * scale); canvas.height = Math.round(h * scale);
      var ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
      var img = ctx.getImageData(0, 0, canvas.width, canvas.height);
      var code = jsQR(img.data, img.width, img.height, { inversionAttempts: 'attemptBoth' });
      return code ? code.data : null;
    });
  }

  /* =====================================================
     보관함 결과 (홈 요약 + 보관함 화면 공용)
     ===================================================== */
  // 저장한 시각 이후 첫 추첨이 대상 회차입니다. 아직 추첨 전이면 draw 없음.
  // 일반 번호: 저장한 시각 이후 첫 추첨 한 번으로 확인합니다. (QR 용지로 저장한 번호는 o.round 회차)
  // 매주 구매 번호(o.weekly): 저장한 시각 이후 열린 모든 추첨을 확인하고, 구입액·당첨금·최고 등수를 더합니다.
  function vaultResult(o, draws) {
    var at = Date.parse(o.at), first = draws.length;
    if (o.round) first = Math.max(0, o.round - draws[0].round);          // QR 용지: 용지에 찍힌 회차부터
    else for (var i = draws.length - 1; i >= 0 && drawAt(draws[i]) > at; i--) first = i;
    var after = draws.slice(first);                     // 대상 회차들 (오래된 회차부터)
    if (!after.length) {
      // 아직 결과가 없는 대상 회차: 용지 회차, 아니면 "저장한 시각" 뒤의 첫 추첨 (지금 시각 기준이 아님)
      var latest = draws[draws.length - 1], nr = o.round || drawAfter(latest, at).round;
      return { o: o, weekly: !!o.weekly, round: nr, from: nr, count: 0, pending: roundAt(latest, nr) <= Date.now() };
    }
    if (!o.weekly) {
      var t = after[0];
      return { o: o, draw: t, round: t.round, rank: rankOf(o.nums, t), hits: hitsOf(o.nums, t) };
    }
    var prize = 0, wins = 0, best = 0, bestDraw = null;
    after.forEach(function (d) {
      var r = rankOf(o.nums, d);
      if (!r) return;
      wins++; prize += prizeOf(r, d);
      if (!best || r < best || (r === best && d.round > bestDraw.round)) { best = r; bestDraw = d; }
    });
    var last = after[after.length - 1];                 // 가장 최근 회차 결과를 대표로 보여 줍니다
    return {
      o: o, weekly: true, draw: last, round: last.round, rank: rankOf(o.nums, last), hits: hitsOf(o.nums, last),
      from: after[0].round, count: after.length, spent: after.length * 1000, prize: prize, wins: wins, best: best, bestDraw: bestDraw
    };
  }
  // 매주 구매 번호들의 합계 (보관함 위쪽 요약)
  function weeklyTotals(rows) {
    var t = { games: 0, spent: 0, prize: 0, wins: 0 };
    rows.forEach(function (r) { if (!r.weekly) return; t.games++; t.spent += r.spent || 0; t.prize += r.prize || 0; t.wins += r.wins || 0; });
    return t;
  }
  function vaultRowHTML(r, i, withActions) {
    var badge = !r.draw ? '<span class="badge wait">' + r.round + (r.pending ? '회 결과 수집 중' : '회 추첨 대기') + '</span>'
      : r.rank ? '<span class="badge win">' + r.round + '회 ' + RANK_TEXT[r.rank] + '</span>'
        : '<span class="badge">' + r.round + '회 낙첨</span>';
    var d = new Date(r.o.at);
    var when = isNaN(d) ? '' : (d.getMonth() + 1) + '월 ' + d.getDate() + '일 저장';
    var weekly = '';
    if (r.weekly) {
      weekly = '<div class="weekly-line">' + (r.count
        ? '<b>' + r.from + '~' + r.round + '회 ' + r.count + '번 구매</b> · 구입 ' + won(r.spent) + ' · 당첨 <span class="' + (r.prize ? 'prize-text' : '') + '">' + won(r.prize) + '</span>' +
          (r.wins ? ' (' + r.wins + '번) · 최고 ' + RANK_TEXT[r.best] + ' (' + r.bestDraw.round + '회)' : ' · 아직 당첨 없음')
        : '<b>' + r.from + '회부터 매주 확인</b> · ' + (r.pending ? '첫 결과를 수집하는 중' : '첫 추첨을 기다리는 중')) + '</div>';
    }
    return '<div class="game' + (r.weekly ? ' is-weekly' : '') + '"><div class="game-body">' +
      balls(r.o.nums, { size: 'sm', nowrap: true, hits: r.draw ? r.hits : null }) +
      '<div class="game-meta">' + badge + ' <span>' + esc(r.o.label || '저장') + ' · ' + when + '</span></div>' + weekly +
      (withActions ? '<button type="button" class="chip chip-sm" data-weekly="' + i + '" aria-pressed="' + !!r.weekly + '">' + icon('refresh', 14) + (r.weekly ? '매주 구매 중' : '매주 구매') + '</button>' : '') +
      '</div>' +
      (withActions ? '<div class="game-actions"><button class="icon-btn" type="button" data-copy="' + i + '" aria-label="복사">' + icon('copy') + '</button>' +
        '<button class="icon-btn btn-danger" type="button" data-del="' + i + '" aria-label="삭제">' + icon('trash') + '</button></div>' : '') +
      '</div>';
  }

  /* =====================================================
     홈
     ===================================================== */
  function initHome() {
    var heroEl = $('#latest'), quickEl = $('#quick-games'), mineEl = $('#mine');
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
      var d = draws[draws.length - 1], next = nextDraw(d), pend = pendingDraw(d);
      var first = d.prizes ? d.prizes[0] : d.firstPrize, winners = d.winners ? d.winners[0] : d.firstWinners;
      heroEl.innerHTML =
        '<div class="card-head"><div><p class="card-sub">' + fmtDate(d.date, true) + ' 추첨</p><h2 class="card-title" style="font-size:22px">제 ' + d.round + '회 당첨번호</h2></div>' +
        '<a class="link" href="simulator.html">회차별 조회' + icon('right', 16) + '</a></div>' +
        balls(d.numbers, { bonus: d.bonus, size: 'lg', nowrap: true }) +
        '<div class="hero-meta"><div class="hero-stat"><span>1등 당첨금 (1인)</span><b class="num">' + (first ? won(first) : '-') + '</b></div>' +
        '<div class="hero-stat"><span>1등 당첨자</span><b class="num">' + (winners != null ? winners + '명' : '-') + '</b></div></div>' +
        (pend ? '<p class="hero-note">제 ' + pend.round + '회(' + kstDateText(pend.at).split(' 오후')[0] + ') 결과를 수집하고 있어요. 보통 추첨 다음 날까지 반영돼요.</p>' : '') +
        '<div class="hero-next"><span>제 ' + next.round + '회 추첨까지<small>' + kstDateText(next.at) + '</small></span><b class="num" id="countdown" aria-live="off"></b></div>';
      var countEl = $('#countdown');
      (function tick() {
        var s = Math.max(0, Math.floor((next.at - Date.now()) / 1000));
        if (!s) { countEl.textContent = '추첨 중'; return; }
        countEl.textContent = Math.floor(s / 86400) + '일 ' + pad(Math.floor(s / 3600) % 24) + ':' + pad(Math.floor(s / 60) % 60) + ':' + pad(s % 60);
        setTimeout(tick, 1000 - Date.now() % 1000);
      })();
      renderMine();
    }).catch(function () { loadError(heroEl); mineEl.innerHTML = ''; });
  }

  /* =====================================================
     번호 생성
     ===================================================== */
  function initGenerate() {
    // 탭: 조건으로 만들기 / 사주로 만들기 (#saju로 바로 열 수 있음)
    function showGenTab(name) {
      $$('#gen-tabs button').forEach(function (b) { b.setAttribute('aria-selected', b.getAttribute('data-tab') === name ? 'true' : 'false'); });
      $('#tab-cond').hidden = name !== 'cond';
      $('#tab-saju').hidden = name !== 'saju';
      try { history.replaceState(null, '', name === 'saju' ? '#saju' : location.pathname); } catch {}
    }
    $$('#gen-tabs button').forEach(function (b) { b.addEventListener('click', function () { showGenTab(b.getAttribute('data-tab')); }); });
    showGenTab(location.hash === '#saju' ? 'saju' : 'cond');
    initSaju();

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
      $('#cnt-fix').textContent = list('fix').length;
      $('#cnt-exc').textContent = list('exc').length;
      hint();
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
    // 지금 어떤 종류를 고르는 중인지 번호판 위에 알려 줍니다.
    function hint() {
      $('#pick-count').innerHTML = mode === 'fix'
        ? '<i class="dot fix"></i>번호를 누르면 <b>꼭 넣을 번호</b>로 표시돼요. 다시 누르면 빠져요.'
        : '<i class="dot exc"></i>번호를 누르면 <b>뺄 번호</b>로 표시돼요. 다시 누르면 빠져요.';
    }
    $$('#mode button').forEach(function (b) {
      b.addEventListener('click', function () {
        mode = b.getAttribute('data-mode');
        $$('#mode button').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        hint();
      });
    });
    $('#reset').addEventListener('click', function () { state = {}; paint(); toast('고른 번호를 모두 지웠습니다'); });
    paint();

    // 조건
    // 조건 칸은 접혀 있고, 제목 옆에 켜진 조건 수를 보여 줍니다
    function condCount() {
      var n = ($$('#odd .chip[aria-pressed="true"]').length ? 1 : 0) + $$('#tab-cond .switch[aria-checked="true"]').length;
      var b = $('#cond-count'); b.textContent = n ? '켜진 조건 ' + n + '개' : '조건 없음'; b.className = 'badge' + (n ? ' wait' : '');
    }
    $$('#odd .chip').forEach(function (c) {
      c.addEventListener('click', function () { c.setAttribute('aria-pressed', c.getAttribute('aria-pressed') === 'true' ? 'false' : 'true'); condCount(); });
    });
    $$('.switch').forEach(function (s) {
      s.addEventListener('click', function () {
        var on = s.getAttribute('aria-checked') !== 'true';
        s.setAttribute('aria-checked', on ? 'true' : 'false');
        var tgt = s.getAttribute('data-reveal'); if (tgt) $(tgt).hidden = !on;
        condCount();
      });
    });
    condCount();
    var games = 5;
    $$('#games button').forEach(function (b) {
      b.addEventListener('click', function () {
        games = +b.getAttribute('data-g');
        $$('#games button').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        $('#gen-label').textContent = games + '게임 생성하기';
      });
    });
    function on(id) { return $(id).getAttribute('aria-checked') === 'true'; }

    /* 연속 번호 / 같은 끝자리 기준 개수
       - 연속: 2~6개. 한 게임은 번호 6개라 6개를 넘는 연속은 있을 수 없고, 1개는 "연속"이 아니에요.
       - 같은 끝자리: 2~5개. 끝자리가 같은 번호는 많아야 5개(1·11·21·31·41)라 6개는 있을 수 없어요. */
    var COUNT_RULE = {
      run: { min: 2, max: 6, low: '연속은 2개부터 셀 수 있어요', high: '한 게임은 번호가 6개라 6개를 넘게 연속될 수 없어요',
        title: function (n) { return n + '개 이상 연속 번호 빼기'; },
        eg: function (n) { var a = []; for (var i = 0; i < n; i++) a.push(12 + i); return '예: ' + a.join('·') + ' 같은 조합 제외'; } },
      end: { min: 2, max: 5, low: '같은 끝자리는 2개부터 셀 수 있어요', high: '끝자리가 같은 번호는 많아야 5개(1·11·21·31·41)라 5개를 넘을 수 없어요',
        title: function (n) { return '같은 끝자리 ' + n + '개 이상 빼기'; },
        eg: function (n) { return '예: ' + [3, 13, 23, 33, 43].slice(0, n).join('·') + ' 같은 조합 제외'; } }
    };
    // 입력값을 검사해 {n} 또는 {error}를 돌려주고, 화면(제목·예시·오류 문구·버튼)을 맞춥니다.
    function checkCount(key) {
      var rule = COUNT_RULE[key], input = $('#' + key + '-n'), raw = String(input.value).trim(), n = Number(raw), err = '';
      if (!/^\d+$/.test(raw)) err = '숫자(정수)로 입력해 주세요';
      else if (n < rule.min) err = rule.low;
      else if (n > rule.max) err = rule.high;
      var box = input.parentNode, msg = $('#' + key + '-err');
      box.classList.toggle('invalid', !!err);
      input.setAttribute('aria-invalid', err ? 'true' : 'false');
      msg.hidden = !err; msg.textContent = err ? err + ' (' + rule.min + '~' + rule.max + ')' : '';
      $('[data-step="-1"]', box).disabled = !err && n <= rule.min;
      $('[data-step="1"]', box).disabled = !err && n >= rule.max;
      if (!err) {
        $('#' + key + '-title').textContent = rule.title(n);
        $('#' + key + '-eg').textContent = rule.eg(n);
        $('#sw-' + key).setAttribute('aria-label', rule.title(n));
      }
      return err ? { error: err } : { n: n };
    }
    Object.keys(COUNT_RULE).forEach(function (key) {
      var input = $('#' + key + '-n'), rule = COUNT_RULE[key];
      $$('.stepper[data-for="' + key + '"] [data-step]').forEach(function (b) {
        b.addEventListener('click', function () {
          var cur = parseInt(input.value, 10);
          if (isNaN(cur)) cur = 3;
          input.value = Math.max(rule.min, Math.min(rule.max, cur + +b.getAttribute('data-step')));
          checkCount(key);
        });
      });
      input.addEventListener('input', function () { checkCount(key); });
      checkCount(key);
    });

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
        odd: $$('#odd .chip[aria-pressed="true"]').map(function (c) { return +c.getAttribute('data-odd'); })
      };
      // 켜 둔 조건의 숫자를 검사합니다. 잘못되면 생성하지 않고 그 칸으로 안내합니다.
      var fixed = list('fix');
      var checks = [['run', '#sw-run', 'runMin', longestRun, '연속 번호'], ['end', '#sw-end', 'endMin', sameEndMax, '같은 끝자리']];
      for (var k = 0; k < checks.length; k++) {
        var c = checks[k];
        if (!on(c[1])) continue;
        var r = checkCount(c[0]);
        if (r.error) { toast(r.error); $('#' + c[0] + '-n').focus(); return; }
        // 고정수만으로 이미 기준에 걸리면 어떤 조합도 만들 수 없어요
        if (fixed.length && c[3](fixed) >= r.n) { toast('고정수(' + fixed.join(', ') + ')에 이미 ' + c[4] + '가 ' + r.n + '개 이상이라 이 조건으로는 만들 수 없어요'); return; }
        opt[c[2]] = r.n;
      }
      if (on('#sw-sum')) {
        var a = parseInt($('#sum-min').value, 10), b = parseInt($('#sum-max').value, 10);
        if (isNaN(a) || isNaN(b) || a > b) { toast('합계 범위를 확인해 주세요 (최소 ≤ 최대)'); return; }
        if (a < 21 || b > 255) { toast('합계는 21(1~6)부터 255(40~45)까지만 나올 수 있어요'); return; }
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

  /* 번호 생성 > 사주로 만들기 (계산은 js/saju.js)
     생년월일·시 → 사주팔자 → 오행 → 이번 주(다음 추첨 회차) 번호 6개와 강력한 번호 1개.
     같은 생년월일·시면 다음 추첨 전까지 항상 같은 번호입니다(추첨 회차를 시드로 씀). */
  var SAJU_KEY = 'lottolab.saju';
  function initSaju() {
    var S = window.LottoSaju; if (!S) return;
    var dateEl = $('#saju-date'), hourEl = $('#saju-hour'), err = $('#saju-err'), box = $('#saju-result');
    var today = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
    dateEl.max = today;
    hourEl.innerHTML = '<option value="">모름</option>' + S.HOURS.map(function (h, i) { return '<option value="' + i + '">' + h + '</option>'; }).join('');
    var saved; try { saved = JSON.parse(localStorage.getItem(SAJU_KEY)); } catch {}
    if (saved && saved.date) { dateEl.value = saved.date; hourEl.value = saved.hour == null ? '' : String(saved.hour); }

    function check() {
      var v = dateEl.value, msg = '';
      if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) msg = '생년월일을 넣어 주세요';
      else {
        var p = v.split('-').map(Number), dt = new Date(Date.UTC(p[0], p[1] - 1, p[2]));
        if (dt.getUTCFullYear() !== p[0] || dt.getUTCMonth() !== p[1] - 1 || dt.getUTCDate() !== p[2]) msg = '없는 날짜예요';
        else if (v < '1900-01-01') msg = '1900년 1월 1일부터 넣을 수 있어요';
        else if (v > today) msg = '오늘보다 뒤의 날짜는 넣을 수 없어요';
      }
      err.hidden = !msg; err.textContent = msg; dateEl.setAttribute('aria-invalid', msg ? 'true' : 'false');
      return !msg;
    }
    dateEl.addEventListener('change', check);
    $('#saju-form').addEventListener('submit', function (e) {
      e.preventDefault();
      if (!check()) { dateEl.focus(); return; }
      var hour = hourEl.value === '' ? null : +hourEl.value;
      try { localStorage.setItem(SAJU_KEY, JSON.stringify({ date: dateEl.value, hour: hour })); } catch {}
      render(dateEl.value, hour, true);
    });

    function pillarCell(label, p) {
      if (!p) return '<div class="pillar unknown"><span class="pl">' + label + '</span><div class="gz"><b>?</b><small>모름</small></div><div class="gz"><b>?</b><small>모름</small></div></div>';
      return '<div class="pillar"><span class="pl">' + label + '</span>' +
        '<div class="gz el-' + S.STEM_EL[p.stem] + '"><b>' + S.STEMS_H[p.stem] + '</b><small>' + S.STEMS[p.stem] + ' · ' + S.EL[S.STEM_EL[p.stem]] + '</small></div>' +
        '<div class="gz el-' + S.BRANCH_EL[p.branch] + '"><b>' + S.BRANCHES_H[p.branch] + '</b><small>' + S.BRANCHES[p.branch] + ' · ' + S.EL[S.BRANCH_EL[p.branch]] + '</small></div></div>';
    }

    function render(birth, hour, scroll) {
      loadDraws().then(function (draws) {
        var b = birth.split('-').map(Number), p = S.pillars(b[0], b[1], b[2], hour);
        var next = nextDraw(draws[draws.length - 1]);
        var dd = new Date(next.at + 9 * 3600e3), drawDay = S.dayPillar(dd.getUTCFullYear(), dd.getUTCMonth() + 1, dd.getUTCDate());
        var w = S.weeklyNumbers(birth, hour, p, next.round, drawDay), total = hour == null ? 6 : 8;
        var me = w.me, maxC = Math.max.apply(null, w.counts);
        box.hidden = false;
        box.innerHTML =
          '<div class="card-head"><div><p class="card-sub">' + b[0] + '년 ' + b[1] + '월 ' + b[2] + '일생' + (hour == null ? '' : ' · ' + S.HOURS[hour].split(' ')[0]) + ' · ' + S.ANIMALS[p.year.branch] + '띠</p>' +
          '<h2 class="card-title" style="font-size:20px">' + next.round + '회 사주 번호</h2></div><span class="badge wait">' + kstDateText(next.at).split(' 오후')[0] + ' 추첨</span></div>' +
          '<div class="saju-balls">' + w.nums.map(function (n) {
            var e = w.numEl(n), pw = n === w.power;
            return '<div class="sb' + (pw ? ' power' : '') + '">' + ball(n, 'lg') + '<span class="el-tag el-' + e + '">' + S.EL[e] + '</span>' + (pw ? '<span class="power-tag">강력</span>' : '') + '</div>';
          }).join('') + '</div>' +
          '<p class="power-line"><b>★ 강력한 번호 ' + w.power + '</b> · 사주에 가장 부족한 <b>' + S.EL[w.need] + '(' + S.EL_H[w.need] + ')</b> 기운을 채우는 번호예요. (' + S.EL[w.need] + ' 기운은 끝자리 ' + ['3·8', '2·7', '5·0', '4·9', '1·6'][w.need] + ')</p>' +
          '<p class="hint">다음 추첨(' + kstDateText(next.at) + ') 전까지는 같은 생년월일' + (hour == null ? '' : '·시') + '이면 언제 봐도 이 번호예요. 추첨이 지나면 새 번호가 나와요.</p>' +
          '<div class="btn-row" style="margin-top:12px"><button class="btn btn-secondary" type="button" id="saju-copy">복사</button><button class="btn btn-primary" type="button" id="saju-save">보관함에 저장</button></div>' +

          '<hr class="divider"><p class="group-label" style="margin-top:0">사주팔자</p>' +
          '<div class="pillars">' + pillarCell('시주', p.hour) + pillarCell('일주', p.day) + pillarCell('월주', p.month) + pillarCell('년주', p.year) + '</div>' +
          '<p class="saju-me">나(일간)는 <b class="el-text-' + me + '">' + S.STEMS[p.day.stem] + S.EL[me] + '(' + S.STEMS_H[p.day.stem] + S.EL_H[me] + ')</b> · ' + S.DAY_MASTER[p.day.stem] + '처럼 ' + S.EL_DESC[me] + '이에요.</p>' +
          (p.nearTerm ? '<p class="hint">절기가 바뀌는 날 무렵에 태어나서 태어난 시에 따라 월주가 달라질 수 있어요. 시를 넣으면 더 정확해요.</p>' : '') +

          '<p class="group-label">오행 분포 (' + total + '글자)</p><div class="bars">' + [0, 1, 2, 3, 4].map(function (e) {
            var c = w.counts[e], tag = e === w.need ? ' <span class="badge prize">채울 기운</span>' : c === maxC && c >= 3 ? ' <span class="badge">넘침</span>' : '';
            return '<div class="bar-row"><span class="lbl"><i class="el-dot el-' + e + '"></i>' + S.EL[e] + '(' + S.EL_H[e] + ')</span>' +
              '<div class="bar-track"><div class="bar-fill el-fill-' + e + '" style="width:' + (c / total * 100).toFixed(0) + '%"></div></div><span class="val num">' + c + '개' + '</span></div>' + (tag ? '<div style="margin:-4px 0 0 74px">' + tag + '</div>' : '');
          }).join('') + '</div>' +

          '<p class="group-label">이번 주 기운</p><p class="saju-me">추첨일 ' + kstDateText(next.at).split(' 오후')[0] + '은 <b>' + S.name(drawDay) + '(' + S.hanja(drawDay) + ')일</b>, ' +
          '<b class="el-text-' + w.weekEl + '">' + S.EL[w.weekEl] + '(' + S.EL_H[w.weekEl] + ')</b> 기운의 날이에요. 이 기운의 번호도 조금 더 자주 골랐어요.</p>' +

          '<details class="fold explain"><summary><span>어떻게 정하나요?</span><svg class="chev" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></summary><ol>' +
          '<li><b>사주팔자</b>: 년주·월주는 절기(입춘 등)를 기준으로 나눠요. 절기는 태어난 날 태양의 위치(황경)를 계산해서 찾아요. 일주는 날짜로, 시주는 일간과 태어난 시로 구해요.</li>' +
          '<li><b>오행 세기</b>: 8글자(시를 모르면 6글자)가 목·화·토·금·수 중 무엇인지 세서, 가장 적은 오행을 <b>채울 기운</b>으로 정해요.</li>' +
          '<li><b>번호와 오행</b>: 전통 하도(河圖) 수리에 따라 번호의 끝자리로 오행을 정해요. 수 1·6, 화 2·7, 목 3·8, 금 4·9, 토 5·0.</li>' +
          '<li><b>강력한 번호</b>: 채울 기운에 해당하는 번호 중 하나를 먼저 골라요.</li>' +
          '<li><b>나머지 5개</b>: 채울 기운의 번호를 가장 많이, 나(일간)와 이번 추첨일의 기운을 그다음으로 자주, 넘치는 기운은 덜 고르도록 무게를 둬서 뽑아요.</li>' +
          '<li><b>매주 같은 번호</b>: 생년월일·시와 추첨 회차를 합쳐 만든 고정된 난수로 뽑기 때문에, 같은 주에는 언제 봐도 같은 번호가 나와요.</li></ol></details>' +
          '<p class="hint" style="margin-top:10px">재미로 보는 전통 풀이예요. 사주 번호도 다른 조합과 당첨 확률은 같아요.</p>';
        $('#saju-copy').addEventListener('click', function () { copySets([w.nums]); });
        $('#saju-save').addEventListener('click', function () { addToVault([w.nums], '사주 번호 ' + next.round + '회'); });
        if (scroll) box.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }).catch(function () { box.hidden = false; loadError(box); });
    }
    if (saved && saved.date && check()) render(saved.date, saved.hour == null ? null : saved.hour, false);
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
    setupTabs('#stats-tabs');
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
            ' style="--t:' + (mix / 100).toFixed(2) + (mix > 55 ? ';color:#fff' : '') + '">' + n + '</button>';
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
      initBestMatch(draws);
      initRules(draws);
    }).catch(function () { loadError(root); });
  }

  /* 통계: "내 번호와 가장 많이 맞은 회차" 버튼 → 번호 고르기 창 → 조회 결과 카드 */
  function initBestMatch(draws) {
    var sheet = $('#best-sheet'), runBtn = $('#best-run'), result = $('#best-result');
    var picker = makePicker($('#best-board'), function (picked) {
      $('#best-status').textContent = picked.length === 6 ? '6개를 모두 골랐어요. 조회해 보세요' : picked.length + ' / 6개 선택 (6개를 모두 골라야 조회할 수 있어요)';
      runBtn.disabled = picked.length !== 6;                   // 6개가 아니면 조회 버튼을 막습니다
    });
    $('#best-all').textContent = '1~' + draws[draws.length - 1].round + '회';
    function open() { if (sheet.showModal) sheet.showModal(); else sheet.setAttribute('open', ''); }
    function close() { if (sheet.close) sheet.close(); else sheet.removeAttribute('open'); }
    $('#best-open').disabled = false;
    $('#best-open').addEventListener('click', open);
    $('#best-close').addEventListener('click', close);
    sheet.addEventListener('click', function (e) { if (e.target === sheet) close(); });   // 바깥(어두운 부분)을 누르면 닫힘
    $('#best-random').addEventListener('click', function () { picker.set(generate(1)[0]); });
    $('#best-clear').addEventListener('click', function () { picker.set([]); });

    runBtn.addEventListener('click', function () {
      var nums = picker.get();
      if (nums.length !== 6) return;
      var r = findBestMatches(nums, draws, 5, 3);
      close();
      result.hidden = false;
      var s = r.summary;
      result.innerHTML =
        '<div class="card-head"><div><h2 class="card-title">가장 많이 맞은 회차</h2><p class="card-sub">맞은 개수가 많은 ' + r.top.length + '개 회차를 최신 회차부터 보여 줘요</p></div></div>' +
        '<p class="group-label" style="margin-top:0">내가 고른 번호</p>' + balls(nums, { nowrap: true }) +
        '<p class="hint" style="margin-top:10px">' + draws.length + '회 중 3개 이상 맞은 회차는 <b>' + r.total + '회</b>예요 ' +
        '(3개 ' + s[3] + ' · 4개 ' + s[4] + ' · 5개 ' + s[5] + ' · 6개 ' + s[6] + ')</p>' +
        (r.top.length ? '<div class="games" style="margin-top:14px">' + r.top.map(function (h) {
          return '<div class="game"><div class="game-body">' +
            '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px">' +
            '<b class="num">' + h.draw.round + '회 <span class="muted" style="font-weight:400">' + fmtDate(h.draw.date) + '</span></b>' +
            '<span class="badge win">' + h.count + '개 일치' + (h.count === 5 && h.bonus ? '+보너스' : '') + ' · ' + RANK_TEXT[h.rank] + '</span></div>' +
            balls(h.draw.numbers, { bonus: h.draw.bonus, size: 'sm', nowrap: true, hits: h.matched.concat(h.bonus ? [h.draw.bonus] : []) }) +
            '<div class="game-meta">맞은 번호: <b>' + h.matched.join(', ') + '</b>' + (h.bonus ? ' (+보너스 ' + h.draw.bonus + ')' : '') + '</div>' +
            '</div></div>';
        }).join('') + '</div>'
          : '<p class="muted" style="margin-top:14px">3개 이상 맞은 회차가 한 번도 없어요.</p>') +
        '<div class="btn-row" style="margin-top:14px"><button class="btn btn-secondary" type="button" id="best-again">번호 바꿔서 다시 조회</button>' +
        '<button class="btn btn-secondary" type="button" id="best-save">이 번호 저장</button></div>';
      $('#best-again').addEventListener('click', open);
      $('#best-save').addEventListener('click', function () { addToVault([nums], '가장 많이 맞은 회차'); });
      result.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  /* 통계: 억지 분석 기록 (규칙은 js/rules.js, GitHub 기록은 scripts/analyze.mjs가 같은 규칙으로 만듭니다) */
  // 전 회차 × 규칙 계산은 느린 휴대폰에서 0.5초 넘게 걸려, 화면이 멈추지 않도록 Web Worker에서 돌립니다.
  function computeRules(draws, done) {
    var fallback = function () { setTimeout(function () { done(window.LottoRules.evaluate(draws)); }, 0); };
    if (!window.Worker) { fallback(); return; }
    try {
      var w = new Worker('js/rules-worker.js');
      w.onmessage = function (e) { w.terminate(); done(e.data); };
      w.onerror = function () { w.terminate(); fallback(); };
      w.postMessage(draws);
    } catch { fallback(); }
  }
  function initRules(draws) {
    if (!window.LottoRules) return;
    computeRules(draws, function (res) { showRules(draws, res); });
  }
  function showRules(draws, res) {
    var idx = draws.length - 1, showAll = false;
    var sheet = $('#rule-sheet');
    function pctTxt(x) { return (x * 100).toFixed(1) + '%'; }
    function afterTxt(r) { return r.after.n ? r.after.hit + '/' + r.after.n + '회' : '아직 없음'; }
    function rowHTML(r, detail) {
      return '<li><button type="button" class="rule-item" data-rule="' + r.id + '"><span class="rule-main"><b>' + esc(r.name) + '</b>' +
        (detail ? '<small>' + esc(detail) + '</small>' : '<small>' + esc(r.group) + ' · 발견 후 ' + afterTxt(r) + '</small>') + '</span>' +
        '<span class="badge' + (r.rate < 0.1 ? ' prize' : '') + '">역대 ' + pctTxt(r.rate) + '</span></button></li>';
    }
    function render() {
      var d = draws[idx], s = window.LottoRules.summary(res, idx);
      $('#rules-prev').disabled = idx === 0;
      $('#rules-next').disabled = idx === draws.length - 1;
      $('#rules-round').innerHTML = '<p class="muted" style="text-align:center;margin-bottom:6px">' + d.round + '회 · ' + fmtDate(d.date) + (idx === draws.length - 1 ? ' · 최신' : '') + '</p>' +
        balls(d.numbers, { bonus: d.bonus, size: 'sm', nowrap: true });
      $('#rules-summary').textContent = s.text;
      var list = showAll ? s.hits : s.hits.slice(0, 6);
      $('#rules-hits').innerHTML = list.map(function (r) { return rowHTML(r, r.hits[idx]); }).join('');
      var more = $('#rules-more');
      more.hidden = s.hits.length <= 6;
      more.textContent = showAll ? '접기' : '맞은 규칙 ' + s.hits.length + '개 모두 보기';
    }
    $('#rules-table').innerHTML = res.rules.slice().sort(function (a, b) { return a.rate - b.rate; }).map(function (r) { return rowHTML(r); }).join('');
    $('#rules-prev').addEventListener('click', function () { if (idx > 0) { idx--; showAll = false; render(); } });
    $('#rules-next').addEventListener('click', function () { if (idx < draws.length - 1) { idx++; showAll = false; render(); } });
    $('#rules-more').addEventListener('click', function () { showAll = !showAll; render(); });

    // 규칙을 누르면 설명과 성적, 최근에 맞은 회차를 보여 줍니다
    $('#rule-sheet-close').addEventListener('click', function () { sheet.close(); });
    sheet.addEventListener('click', function (e) { if (e.target === sheet) sheet.close(); });
    $('#rules-card').addEventListener('click', function (e) {
      var b = e.target.closest('[data-rule]'); if (!b) return;
      var r = res.rules.filter(function (x) { return x.id === b.getAttribute('data-rule'); })[0]; if (!r) return;
      var recent = [];
      for (var i = r.hits.length - 1; i >= 0 && recent.length < 8; i--) if (r.hits[i]) recent.push('<li><b class="num">' + draws[i].round + '회</b> <span class="muted">' + esc(r.hits[i]) + '</span></li>');
      $('#rule-sheet-group').textContent = r.group + ' · ' + r.since + '회에 만든 규칙';
      $('#rule-sheet-title').textContent = r.name;
      $('#rule-sheet-body').innerHTML = '<p style="color:var(--text-2);font-size:14px">' + esc(r.desc) + '</p>' +
        '<div class="tiles" style="margin-top:14px">' +
        '<div class="tile"><span>역대 적중</span><b class="num">' + pctTxt(r.rate) + '</b><small class="muted">' + r.total + ' / ' + draws.length + '회</small></div>' +
        '<div class="tile"><span>발견 후 (진짜 성적)</span><b class="num">' + (r.after.n ? pctTxt(r.after.hit / r.after.n) : '-') + '</b><small class="muted">' + afterTxt(r) + '</small></div>' +
        '<div class="tile"><span>최근 10회</span><b class="num">' + r.recent10 + ' / 10</b></div>' +
        '<div class="tile"><span>연속 적중</span><b class="num">' + r.streak + '회째</b></div></div>' +
        '<p class="group-label">최근에 맞은 회차</p><ul class="hit-list">' + (recent.join('') || '<li class="muted">아직 없어요</li>') + '</ul>' +
        '<p class="hint" style="margin-top:12px">' + r.since + '회까지는 규칙을 만들 때 이미 본 결과라 끼워 맞춘 기록이에요. ' + (r.since + 1) + '회부터의 "발견 후" 비율이 역대 비율과 비슷하면, 그 규칙은 그냥 원래 그만큼 일어나는 일이라는 뜻이에요.</p>';
      sheet.showModal();
    });
    render();
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
      $('#tab-qr').hidden = name !== 'qr';
      try { history.replaceState(null, '', name === 'round' ? location.pathname : '#' + name); } catch {}
    }
    $$('#check-tabs button').forEach(function (b) { b.addEventListener('click', function () { showTab(b.getAttribute('data-tab')); }); });
    showTab(location.hash === '#mine' ? 'mine' : location.hash === '#qr' ? 'qr' : 'round');
    initQr();

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
    var picker = makePicker($('#pick-board'), function (picked) {
      $('#pick-status').textContent = picked.length === 6 ? '6개를 모두 골랐어요' : picked.length + ' / 6개 선택';
      $('#run-check').disabled = picked.length !== 6;
    });
    $('#pick-random').addEventListener('click', function () { picker.set(generate(1)[0]); });
    $('#pick-clear').addEventListener('click', function () { picker.set([]); $('#check-result').hidden = true; });
    var vault = loadVault(), sel = $('#pick-vault');
    if (vault.length) {
      sel.innerHTML = '<option value="">보관함에서 불러오기 (' + vault.length + '개)</option>' + vault.map(function (o, i) {
        return '<option value="' + i + '">' + o.nums.map(pad).join(' ') + (o.label ? ' · ' + esc(o.label) : '') + '</option>';
      }).join('');
      sel.addEventListener('change', function () { if (sel.value !== '') picker.set(vault[+sel.value].nums); });
    } else sel.hidden = true;

    $('#run-check').addEventListener('click', function () {
      var nums = picker.get(), counts = [0, 0, 0, 0, 0, 0], prize = 0, best = null, hasAll = true;
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

  /* 당첨 조회 > 용지 QR: 카메라 스캔 / 사진에서 찾기 / 주소 붙여넣기 → parseTicket → 결과 */
  function initQr() {
    var sheet = $('#qr-sheet'), video = $('#qr-video'), status = $('#qr-status'), canvas = document.createElement('canvas');
    var stream = null, timer = null, busy = false;

    function stop() {
      clearTimeout(timer); timer = null;
      if (stream) { stream.getTracks().forEach(function (t) { t.stop(); }); stream = null; }
      video.srcObject = null;
    }
    function closeSheet() { stop(); if (sheet.open) sheet.close(); }
    sheet.addEventListener('close', stop);                                   // Esc나 닫기 버튼 모두 카메라를 끔
    $('#qr-close').addEventListener('click', closeSheet);

    // 읽은 글자를 로또 용지로 해석해 결과를 그립니다. 로또 QR이 아니면 false.
    function handle(text) {
      var t = parseTicket(text);
      if (!t) return false;
      closeSheet();
      showTicket(t);
      return true;
    }

    // 1) 카메라로 스캔: 뒤쪽 카메라를 켜고 0.25초마다 화면을 읽습니다.
    $('#qr-scan').addEventListener('click', function () {
      if (!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)) { toast('이 브라우저는 카메라를 쓸 수 없어요. [사진에서 찾기]를 써 주세요'); return; }
      status.textContent = '카메라를 켜는 중…';
      sheet.showModal();
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false }).then(function (s) {
        if (!sheet.open) { s.getTracks().forEach(function (t) { t.stop(); }); return; }
        stream = s; video.srcObject = s;
        var playing = video.play();
        if (playing && playing.catch) playing.catch(function () { status.textContent = '카메라 화면을 켜지 못했어요. [사진에서 찾기]를 써 주세요'; });
        status.textContent = '용지의 QR 코드를 네모 안에 맞춰 주세요';
        (function loop() {
          if (!stream) return;
          if (!busy && video.readyState >= 2 && video.videoWidth) {
            busy = true;
            readQR(video, video.videoWidth, video.videoHeight, canvas).then(function (text) {
              busy = false;
              if (text && !handle(text)) status.textContent = '로또 용지 QR이 아니에요. 용지 아래쪽 QR을 비춰 주세요';
            }, function () { busy = false; status.textContent = 'QR 읽기 도구를 불러오지 못했어요. 인터넷 연결을 확인해 주세요'; });
          }
          timer = setTimeout(loop, 250);
        })();
      }, function (err) {
        status.textContent = err && err.name === 'NotAllowedError'
          ? '카메라 권한이 꺼져 있어요. 브라우저 설정에서 허용하거나 [사진에서 찾기]를 써 주세요'
          : '카메라를 켤 수 없어요. [사진에서 찾기]를 써 주세요';
      });
    });

    // 2) 사진에서 찾기: 고른 사진을 읽습니다. 큰 사진에서 못 찾으면 작게 줄여 한 번 더 봅니다.
    $('#qr-photo').addEventListener('click', function () { $('#qr-file').click(); });
    $('#qr-file').addEventListener('change', function () {
      var f = this.files && this.files[0]; this.value = '';
      if (!f) return;
      var img = new Image(), url = URL.createObjectURL(f);
      img.onload = function () {
        URL.revokeObjectURL(url);
        readQR(img, img.naturalWidth, img.naturalHeight, canvas).then(function (text) {
          if (!text && !detector) {
            var c2 = document.createElement('canvas'), k = 400 / Math.max(img.naturalWidth, img.naturalHeight);
            c2.width = Math.round(img.naturalWidth * k); c2.height = Math.round(img.naturalHeight * k);
            c2.getContext('2d').drawImage(img, 0, 0, c2.width, c2.height);
            return readQR(c2, c2.width, c2.height, canvas);
          }
          return text;
        }).then(function (text) {
          if (!text) toast('사진에서 QR 코드를 찾지 못했어요. QR이 크고 선명하게 나오도록 다시 찍어 주세요');
          else if (!handle(text)) toast('로또 용지 QR이 아니에요');
        }, function () { toast('QR 읽기 도구를 불러오지 못했어요. 인터넷 연결을 확인해 주세요'); });
      };
      img.onerror = function () { URL.revokeObjectURL(url); toast('사진을 열 수 없어요'); };
      img.src = url;
    });

    // 3) 주소 붙여넣기: 다른 앱으로 읽은 QR 주소를 그대로 붙여 넣습니다.
    $('#qr-form').addEventListener('submit', function (e) {
      e.preventDefault();
      if (!handle($('#qr-text').value.trim())) toast('로또 용지 QR 주소가 아니에요. "v=" 가 들어 있는 주소를 붙여 넣어 주세요');
    });

    // 결과: 용지 회차가 추첨된 회차면 게임마다 등수·당첨금, 아직이면 추첨 대기 안내
    function showTicket(t) {
      var box = $('#qr-result');
      loadDraws().then(function (draws) {
        var d = draws[t.round - draws[0].round], total = 0, winCount = 0;
        var rows = t.games.map(function (g, i) {
          var L = String.fromCharCode(65 + i);
          if (!d) return '<div class="game"><span class="game-label">' + L + '</span><div class="game-body">' + balls(g, { size: 'sm', nowrap: true }) + '</div></div>';
          var r = rankOf(g, d), p = prizeOf(r, d);
          total += p; if (r) winCount++;
          return '<div class="game"><span class="game-label">' + L + '</span><div class="game-body">' + balls(g, { size: 'sm', nowrap: true, hits: hitsOf(g, d) }) +
            '<div class="game-meta">' + (r ? '<span class="badge win">' + RANK_TEXT[r] + '</span> <span class="prize-text">' + comma(p) + '원</span>' : '<span class="badge">낙첨</span>') +
            ' · ' + g.filter(function (n) { return d.numbers.indexOf(n) >= 0; }).length + '개 일치' + (g.indexOf(d.bonus) >= 0 ? ' + 보너스' : '') + '</div></div></div>';
        }).join('');
        var head = d
          ? '<div class="card-head"><div><p class="card-sub">' + fmtDate(d.date, true) + ' 추첨</p><h2 class="card-title" style="font-size:20px">제 ' + t.round + '회 용지 · ' + t.games.length + '게임</h2></div>' +
            '<span class="badge ' + (winCount ? 'win' : '') + '">' + (winCount ? winCount + '게임 당첨' : '모두 낙첨') + '</span></div>' +
            '<p class="group-label" style="margin-top:0">당첨번호</p>' + balls(d.numbers, { bonus: d.bonus, size: 'sm', nowrap: true }) +
            '<p class="group-label">내 용지</p>'
          : (function () {
            var tAt = roundAt(draws[draws.length - 1], t.round), done = tAt <= Date.now();
            return '<div class="card-head"><div><p class="card-sub">' + (done ? '추첨은 끝났고 결과를 수집하고 있어요' : '아직 추첨 전이에요') + '</p><h2 class="card-title" style="font-size:20px">제 ' + t.round + '회 용지 · ' + t.games.length + '게임</h2></div><span class="badge wait">' + (done ? '결과 수집 중' : '추첨 대기') + '</span></div>' +
              '<p class="hint" style="margin-bottom:10px">' + kstDateText(tAt) + ' 추첨' + (done ? '이었어요. ' : '이에요. ') + '보관함에 저장해 두면 결과가 들어오는 대로 자동으로 보여 드려요.</p>';
          })();
        box.hidden = false;
        box.innerHTML = head + '<div class="games">' + rows + '</div>' +
          (d ? '<div class="tiles" style="margin-top:14px"><div class="tile"><span>총 당첨금</span><b class="num ' + (total ? 'prize' : '') + '">' + comma(total) + '원</b></div>' +
            '<div class="tile"><span>구입 금액</span><b class="num">' + comma(t.games.length * 1000) + '원</b></div></div>' : '') +
          '<div class="btn-row" style="margin-top:14px"><button class="btn btn-secondary" type="button" id="qr-again">다른 용지 확인</button>' +
          '<button class="btn btn-primary" type="button" id="qr-save">보관함에 저장</button></div>';
        $('#qr-again').addEventListener('click', function () { box.hidden = true; $('#qr-scan').focus(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
        $('#qr-save').addEventListener('click', function () { addToVault(t.games, 'QR 용지 ' + t.round + '회', t.round); });
        box.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
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
      $('#vault-summary').textContent = checked ? '결과가 나온 ' + checked + '게임 중 ' + wins + '게임 당첨 (매주 구매 번호는 최근 회차 기준)' : '아직 결과가 나온 게임이 없어요';
      var t = weeklyTotals(rows), wk = $('#vault-weekly');
      wk.hidden = !t.games;
      if (t.games) wk.innerHTML =
        '<p class="group-label">매주 구매 ' + t.games + '게임 · 매주 ' + comma(t.games * 1000) + '원</p>' +
        '<div class="tiles"><div class="tile"><span>누적 구입</span><b class="num">' + won(t.spent) + '</b></div>' +
        '<div class="tile"><span>누적 당첨</span><b class="num prize">' + won(t.prize) + '</b></div>' +
        '<div class="tile"><span>회수율</span><b class="num">' + (t.spent ? (t.prize / t.spent * 100).toLocaleString('ko-KR', { maximumFractionDigits: 1 }) + '%' : '-') + '</b></div>' +
        '<div class="tile"><span>당첨 횟수</span><b class="num">' + t.wins + '번</b></div></div>';
      // 매주 구매 번호를 위에, 나머지는 저장한 순서대로
      var order = rows.map(function (r, i) { return i; }).sort(function (a, b) { return (rows[b].weekly ? 1 : 0) - (rows[a].weekly ? 1 : 0) || a - b; });
      listEl.innerHTML = '<div class="games">' + order.map(function (i) { return vaultRowHTML(rows[i], i, true); }).join('') + '</div>';
    }
    listEl.addEventListener('click', function (e) {
      var v = loadVault(), c = e.target.closest('[data-copy]'), d = e.target.closest('[data-del]'), w = e.target.closest('[data-weekly]');
      if (c) copySets([v[+c.getAttribute('data-copy')].nums]);
      if (w) {
        var o = v[+w.getAttribute('data-weekly')];
        if (o.weekly) { delete o.weekly; toast('매주 구매를 껐어요. 저장 뒤 첫 추첨 결과만 보여 줘요'); }
        else { o.weekly = true; toast('매주 구매로 표시했어요. 저장한 뒤 열린 모든 회차를 확인해요'); }
        saveVault(v); draw();
      }
      if (d) { v.splice(+d.getAttribute('data-del'), 1); saveVault(v); draw(); lastBackupText(); toast('삭제했습니다'); }
    });
    $('#vault-clear').addEventListener('click', function () {
      if (window.confirm('저장한 번호를 모두 지울까요? 되돌릴 수 없습니다. 필요하면 먼저 [파일로 내보내기]로 백업해 두세요.')) { saveVault([]); draw(); lastBackupText(); toast('모두 지웠습니다'); }
    });
    $('#vault-copy').addEventListener('click', function () { copySets(loadVault().map(function (o) { return o.nums; })); });
    // ---------- 백업·옮기기 ----------
    function lastBackupText() {
      var t; try { t = localStorage.getItem(BACKUP_KEY); } catch {}
      var d = t ? new Date(t) : null;
      $('#backup-last').textContent = d && !isNaN(d) ? '마지막 백업: ' + (d.getMonth() + 1) + '월 ' + d.getDate() + '일 ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) : '아직 백업하지 않았어요';
      var empty = !loadVault().length;
      $('#backup-export').disabled = empty; $('#backup-link').disabled = empty;
    }
    function markBackup() { try { localStorage.setItem(BACKUP_KEY, new Date().toISOString()); } catch {} lastBackupText(); }
    function report(r) {
      var extra = [];
      if (r.dup) extra.push('이미 있는 ' + r.dup + '게임');
      if (r.bad) extra.push('잘못된 ' + r.bad + '게임');
      if (r.full) extra.push('자리가 없어 ' + r.full + '게임');
      toast(r.failed ? '저장 공간이 부족해 가져오지 못했어요'
        : r.added ? r.added + '게임을 가져왔어요' + (extra.length ? ' (' + extra.join(', ') + ' 제외)' : '')
          : r.full ? '보관함이 가득 차서(최대 ' + VAULT_MAX + '게임) 가져오지 못했어요'
            : r.dup ? '모두 이미 보관함에 있는 번호예요' : '가져올 수 있는 번호가 없어요');
      draw(); lastBackupText();
    }
    // 1) 파일로 내보내기: 휴대폰은 공유 창(파일 앱·메신저 등), 그 밖에는 내려받기
    $('#backup-export').addEventListener('click', function () {
      var v = loadVault(); if (!v.length) return;
      var now = new Date(), name = 'lottolab-backup-' + now.getFullYear() + pad(now.getMonth() + 1) + pad(now.getDate()) + '.json';
      var text = JSON.stringify({ app: 'lottolab', version: 1, exportedAt: now.toISOString(), items: v }, null, 2);
      var file = null;
      try { file = new File([text], name, { type: 'application/json' }); } catch {}
      if (file && navigator.canShare && navigator.share && navigator.canShare({ files: [file] })) {
        navigator.share({ files: [file], title: '로또랩 보관함 백업' }).then(function () { markBackup(); toast('백업 파일을 보냈어요'); }, function () {});
        return;
      }
      var a = document.createElement('a'), url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
      a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      markBackup(); toast(v.length + '게임을 ' + name + ' 파일로 저장했어요');
    });
    // 2) 파일에서 가져오기: 내보낸 파일(또는 예전 보관함 목록 그대로)을 읽어 합칩니다
    $('#backup-import').addEventListener('click', function () { $('#backup-file').click(); });
    $('#backup-file').addEventListener('change', function () {
      var f = this.files && this.files[0]; this.value = '';
      if (!f) return;
      var rd = new FileReader();
      rd.onload = function () {
        var data; try { data = JSON.parse(rd.result); } catch { toast('로또랩 백업 파일이 아니에요'); return; }
        var items = Array.isArray(data) ? data : data && Array.isArray(data.items) ? data.items : null;
        if (!items) { toast('로또랩 백업 파일이 아니에요'); return; }
        report(mergeVault(items));
      };
      rd.onerror = function () { toast('파일을 읽을 수 없어요'); };
      rd.readAsText(f);
    });
    // 3) 옮기기 링크: 링크 하나에 보관함 전체를 담습니다. 휴대폰은 공유 창, 그 밖에는 복사
    $('#backup-link').addEventListener('click', function () {
      var v = loadVault(); if (!v.length) return;
      var url = vaultLink(v), long = url.length > 8000;
      if (long) toast('번호가 많아 링크가 길어요(' + comma(url.length) + '자). 메신저에서 잘릴 수 있으니 [파일로 내보내기]를 권해요');
      if (navigator.share) {
        navigator.share({ title: '로또랩 보관함', text: '로또랩 보관함 ' + v.length + '게임', url: url }).then(function () { markBackup(); }, function () {});
        return;
      }
      copyText(url).then(function (ok) {
        if (ok) { markBackup(); if (!long) toast('옮기기 링크를 복사했어요. 다른 기기에서 열면 보관함에 넣을 수 있어요'); }
        else window.prompt('아래 링크를 복사해 다른 기기에서 열어 주세요', url);
      });
    });
    // 링크로 열었을 때: 받은 번호를 미리 보여 주고, 누르면 합칩니다
    var incoming = readVaultLink(location.hash);
    if (incoming) {
      var box = $('#vault-import');
      box.hidden = false;
      var clearHash = function () { try { history.replaceState(null, '', location.pathname); } catch {} box.hidden = true; };
      if (!incoming.length) {
        box.innerHTML = '<p class="muted">이 링크에는 넣을 수 있는 번호가 없어요. 링크가 잘렸거나, 저장 시각이 미래로 되어 있는 등 올바르지 않은 항목뿐이에요. 보낸 사람에게 다시 받아 주세요.</p>' +
          '<div class="btn-row" style="margin-top:12px"><button class="btn btn-secondary" type="button" id="import-cancel">닫기</button></div>';
      } else {
        var have = loadVault().length;
        box.innerHTML = '<div class="card-head"><div><h2 class="card-title">링크로 받은 번호 ' + incoming.length + '게임</h2><p class="card-sub">보관함에 넣을까요? 지금 보관함 ' + have + '게임 · 남은 자리 ' + Math.max(0, VAULT_MAX - have) + '게임. 있던 번호는 지우지 않고, 이미 있는 번호는 건너뛰어요.</p></div></div>' +
          '<div class="games">' + incoming.slice(0, 5).map(function (o) {
            return '<div class="game"><div class="game-body">' + balls(o.nums, { size: 'sm', nowrap: true }) + '<div class="game-meta">' + esc(o.label || '저장') + (o.weekly ? ' · 매주 구매' : '') + (o.round && String(o.label).indexOf(o.round + '회') < 0 ? ' · ' + o.round + '회 용지' : '') + '</div></div></div>';
          }).join('') + '</div>' + (incoming.length > 5 ? '<p class="hint" style="margin-top:8px">외 ' + (incoming.length - 5) + '게임</p>' : '') +
          '<div class="btn-row" style="margin-top:14px"><button class="btn btn-secondary" type="button" id="import-cancel">취소</button>' +
          '<button class="btn btn-primary" type="button" id="import-ok">보관함에 넣기</button></div>';
        $('#import-ok').addEventListener('click', function () { report(mergeVault(incoming)); clearHash(); });
      }
      $('#import-cancel').addEventListener('click', clearHash);
    }
    lastBackupText();
    draw();
    // 홈의 기능 지도에서 vault.html#backup / #weekly로 들어오면 그 자리로 안내합니다
    function goHash() {
      var h = location.hash;
      if (h === '#backup') { var bk = $('#backup'); bk.scrollIntoView({ block: 'start' }); bk.classList.add('flash'); setTimeout(function () { bk.classList.remove('flash'); }, 1600); }
      if (h === '#weekly') {
        var has = loadVault().some(function (o) { return o.weekly; });
        $('#weekly-help').hidden = false;
        (has ? $('#vault-tools') : $('#weekly-help')).scrollIntoView({ block: 'start' });
      }
    }
    goHash();
    window.addEventListener('hashchange', goHash);
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
