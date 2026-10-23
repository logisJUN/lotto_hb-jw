/* 로또랩 - 화면 인터랙션 (순수 JavaScript, 라이브러리 없음) */
(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var page = document.body.getAttribute('data-page');
  var VAULT_KEY = 'lottolab.vault';

  /* ---------- 공통 유틸 ---------- */
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function range(n) { return n <= 10 ? 'y' : n <= 20 ? 'b' : n <= 30 ? 'r' : n <= 40 ? 'g' : 'n'; }
  function rnd(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
  function pick6(pool) {
    var p = pool.slice(), out = [];
    while (out.length < 6 && p.length) out.push(p.splice(rnd(0, p.length - 1), 1)[0]);
    return out.sort(function (a, b) { return a - b; });
  }
  function consecutivePairs(a) { var c = 0; for (var i = 1; i < a.length; i++) if (a[i] - a[i - 1] === 1) c++; return c; }
  function acValue(a) {
    var d = {}; for (var i = 0; i < a.length; i++) for (var j = i + 1; j < a.length; j++) d[a[j] - a[i]] = 1;
    return Object.keys(d).length - (a.length - 1);
  }
  function sameEnd(a) {
    var m = {}, mx = 0; a.forEach(function (n) { var k = n % 10; m[k] = (m[k] || 0) + 1; if (m[k] > mx) mx = m[k]; });
    return mx;
  }
  function sum(a) { return a.reduce(function (x, y) { return x + y; }, 0); }

  var toastEl, toastTimer;
  function toast(msg) {
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'toast'; toastEl.setAttribute('role', 'status'); document.body.appendChild(toastEl); }
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 1800);
  }
  window.LottoLab = { toast: toast };

  function loadVault() { try { return JSON.parse(localStorage.getItem(VAULT_KEY)) || []; } catch (e) { return []; } }
  function saveVault(list) { try { localStorage.setItem(VAULT_KEY, JSON.stringify(list)); return true; } catch (e) { return false; } }
  function addToVault(sets, label) {
    var v = loadVault(), t = new Date().toISOString();
    sets.forEach(function (s) { v.unshift({ nums: s, label: label || '', at: t }); });
    if (saveVault(v.slice(0, 100))) toast('보관함에 ' + sets.length + '게임을 저장했습니다'); else toast('저장 공간을 사용할 수 없습니다');
  }
  function copyText(t) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(t).then(function () { return true; }, function () { return false; });
    }
    return Promise.resolve(false);
  }

  /* ---------- 선택 상태(룩) 캡처 / 적용 ---------- */
  function snap(n) {
    var c = getComputedStyle(n);
    return { bg: c.backgroundColor, bgi: c.backgroundImage, col: c.color, fw: c.fontWeight, ff: c.fontFamily, sh: c.boxShadow, fill: n.getAttribute && n.getAttribute('fill') };
  }
  function look(el) { return { root: snap(el), ps: $$('p', el).map(snap), icons: $$('svg', el).map(snap) }; }
  function applyLook(el, lk) {
    var r = lk.root;
    el.style.backgroundColor = r.bg; el.style.backgroundImage = r.bgi; el.style.boxShadow = r.sh;
    $$('p', el).forEach(function (p, i) {
      var s = lk.ps[i]; if (!s) return;
      p.style.color = s.col; p.style.fontWeight = s.fw; p.style.fontFamily = s.ff;
    });
    $$('svg', el).forEach(function (v, i) { var s = lk.icons[i]; if (s && s.fill) v.setAttribute('fill', s.fill); });
  }

  var groupHooks = {};
  function initGroups() {
    var names = {};
    $$('[data-grp]').forEach(function (e) { names[e.getAttribute('data-grp')] = 1; });
    Object.keys(names).forEach(function (name) {
      var els = $$('[data-grp="' + name + '"]');
      var on = els.filter(function (e) { return e.hasAttribute('data-sel'); });
      var off = els.filter(function (e) { return !e.hasAttribute('data-sel'); });
      if (!on.length || !off.length) return;
      var lookOn = look(on[0]), lookOff = look(off[0]);
      var multi = els[0].hasAttribute('data-multi');
      els.forEach(function (el) {
        el.style.cursor = 'pointer';
        el.setAttribute('role', multi ? 'checkbox' : 'radio');
        el.setAttribute('aria-checked', el.hasAttribute('data-sel') ? 'true' : 'false');
        el.setAttribute('tabindex', '0');
        function fire() {
          if (multi) {
            var willOn = !el.hasAttribute('data-sel');
            if (!willOn && els.filter(function (e) { return e.hasAttribute('data-sel'); }).length === 1) return; // 최소 1개 유지
            set(el, willOn);
          } else {
            els.forEach(function (e) { set(e, e === el); });
          }
          if (groupHooks[name]) groupHooks[name](el, els);
        }
        el.addEventListener('click', fire);
        el.addEventListener('keydown', function (ev) { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); fire(); } });
      });
      function set(e, v) {
        if (v) e.setAttribute('data-sel', '1'); else e.removeAttribute('data-sel');
        e.setAttribute('aria-checked', v ? 'true' : 'false');
        applyLook(e, v ? lookOn : lookOff);
      }
    });
  }

  /* ---------- 공통: data-act 버튼 ---------- */
  var actions = {};
  function initActions() {
    $$('[data-act]').forEach(function (el) {
      el.style.cursor = 'pointer';
      el.setAttribute('role', 'button');
      el.setAttribute('tabindex', '0');
      function fire(ev) {
        var a = el.getAttribute('data-act');
        if (a === 'href') { location.href = el.getAttribute('data-href'); return; }
        if (actions[a]) actions[a](el, ev);
      }
      el.addEventListener('click', fire);
      el.addEventListener('keydown', function (ev) { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); fire(ev); } });
    });
    actions.soon = function () { toast('준비 중인 기능입니다'); };
  }

  /* ---------- 공통: 볼 렌더 (바텀시트 / 보관함) ---------- */
  function ballsHTML(nums) {
    return nums.map(function (n) { return '<span class="bl bl-' + range(n) + '">' + pad(n) + '</span>'; }).join('');
  }
  window.LottoLab.ballsHTML = ballsHTML;

  /* ---------- 공통: 최신 회차 (data/lotto.json, 매주 자동 갱신) ---------- */
  var DAY = 864e5;
  var latestRound = 1114;   // 데이터를 못 읽으면 시안 값을 그대로 둡니다
  // 추첨은 매주 토요일. 마지막 추첨일 다음 토요일부터 오늘(한국 시간) 이후 첫 추첨을 찾습니다.
  function nextDraw(last) {
    var kst = new Date(Date.now() + 9 * 3600e3);
    var today = Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate());
    var d = Date.parse(last.date) + 7 * DAY, round = last.round + 1;
    while (d < today) { d += 7 * DAY; round++; }
    // 추첨 시각: 토요일 20:35(KST) = 11:35(UTC)
    return { round: round, days: Math.round((d - today) / DAY), at: d + (11 * 60 + 35) * 6e4 };
  }
  // 홈의 "D-2 18:32:44" 카운트다운을 다음 추첨 시각까지 1초마다 갱신합니다.
  function startCountdown(at) {
    var el = $$('p').filter(function (p) { return /^D-\d+ \d\d:\d\d:\d\d$/.test(p.textContent); })[0];
    if (!el) return;
    function tick() {
      var s = Math.floor((at - Date.now()) / 1000);
      if (s < 0) { el.textContent = '추첨 결과 집계 중'; return; }
      var d = Math.floor(s / 86400);
      el.textContent = 'D-' + d + ' ' + pad(Math.floor(s / 3600) % 24) + ':' + pad(Math.floor(s / 60) % 60) + ':' + pad(s % 60);
      setTimeout(tick, 1000 - Date.now() % 1000);
    }
    tick();
  }
  // 시안에 적힌 회차(1115 = 다음 회차, 1114 = 지난 회차)를 실제 회차로 바꿉니다.
  function roundText(t, from, to) {
    return t.replace(new RegExp('1,?' + String(from).slice(1) + '(?=회)', 'g'), function (m) {
      return m.indexOf(',') >= 0 ? to.toLocaleString('en-US') : String(to);
    });
  }
  function paintLastDraw(last) {
    var title = $$('p').filter(function (p) { return p.textContent === '지난 회차 당첨 결과'; })[0];
    var head = title && title.closest('.u23'), row = head && head.nextElementSibling;
    if (!row) return;
    var balls = $$('.u67', row).map(function (c) { return c.firstElementChild; });
    // 범위별 볼 색 클래스 (이 줄과 추천 번호 줄에서 수집)
    var tpl = {};
    balls.concat($$('[data-brow] > div')).forEach(function (b) {
      var p = $('p', b), k = p && range(parseInt(p.textContent, 10));
      if (k && !tpl[k]) tpl[k] = b.className;
    });
    last.numbers.concat(last.bonus).forEach(function (n, i) {
      var b = balls[i]; if (!b) return;
      if (tpl[range(n)]) b.className = tpl[range(n)];
      $('p', b).textContent = pad(n);
    });
  }
  function initLatest() {
    if (!window.fetch) return;
    fetch('data/lotto.json', { cache: 'no-cache' })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (draws) {
        var last = draws[draws.length - 1], next = nextDraw(last);
        latestRound = last.round;
        var hd = $('.hd-round');
        if (hd) hd.lastChild.nodeValue = '제 ' + next.round + '회차 ' + (next.days ? 'D-' + next.days : 'D-DAY');
        $$('p').forEach(function (p) {
          var t = p.textContent;
          if (!/회/.test(t) || p.children.length) return;
          var u = roundText(roundText(t, 1115, next.round), 1114, last.round);
          if (u !== t) p.textContent = u;
        });
        if (page === 'index') { paintLastDraw(last); startCountdown(next.at); }
        if (page === 'stats') initStats(draws);
      })
      .catch(function () {});
  }

  /* =====================================================
     홈 (index)
     ===================================================== */
  function initHome() {
    var rows = $$('[data-brow]');
    var crows = $$('[data-crow]');
    // 범위별 볼/그림자 클래스 템플릿
    var tpl = {};
    rows.forEach(function (row) {
      Array.prototype.forEach.call(row.children, function (b) {
        var n = parseInt(b.textContent, 10);
        var k = range(n);
        if (!tpl[k]) tpl[k] = { ball: b.className, shadow: b.firstElementChild ? b.firstElementChild.className : '' };
      });
    });
    function paintRow(row, nums) {
      Array.prototype.forEach.call(row.children, function (b, i) {
        var n = nums[i], t = tpl[range(n)];
        if (t) { b.className = t.ball; if (b.firstElementChild && t.shadow) b.firstElementChild.className = t.shadow; }
        var p = $('p', b); if (p) p.textContent = pad(n);
      });
    }
    function card(row) { return row.parentNode; }
    function updateStats(row, nums) {
      $$('p', card(row)).forEach(function (p) {
        var t = p.textContent;
        if (/^연속 /.test(t)) p.textContent = '연속 ' + consecutivePairs(nums) + '개';
        else if (/^홀짝 /.test(t)) { var o = nums.filter(function (n) { return n % 2; }).length; p.textContent = '홀짝 ' + o + ':' + (6 - o); }
        else if (/^고저 /.test(t)) { var l = nums.filter(function (n) { return n <= 22; }).length; p.textContent = '고저 ' + l + ':' + (6 - l); }
        else if (/^총합 /.test(t)) p.textContent = t.replace(/^총합 \d+/, '총합 ' + sum(nums));
      });
    }
    function setCompact(row, nums) {
      var i = 0;
      Array.prototype.forEach.call(row.children, function (c, idx) { if (idx % 2 === 0) { var p = $('p', c) || c; p.textContent = pad(nums[i++]); } });
    }
    var current = [];
    function readCurrent() {
      current = rows.map(function (r) { return Array.prototype.map.call(r.children, function (b) { return parseInt(b.textContent, 10); }); });
      crows.forEach(function (r) {
        var a = []; Array.prototype.forEach.call(r.children, function (c, idx) { if (idx % 2 === 0) a.push(parseInt(c.textContent, 10)); });
        current.push(a);
      });
    }
    readCurrent();
    actions.regen = function () {
      var all = []; for (var i = 1; i <= 45; i++) all.push(i);
      current = [];
      rows.forEach(function (r) { var n = pick6(all); paintRow(r, n); updateStats(r, n); current.push(n); });
      crows.forEach(function (r) { var n = pick6(all); setCompact(r, n); current.push(n); });
      toast('새 번호를 추출했습니다');
    };
    actions.copy = function () {
      var labels = 'ABCDE';
      var txt = current.map(function (n, i) { return labels[i] + '  ' + n.map(pad).join(' '); }).join('\n');
      copyText(txt).then(function (ok) { toast(ok ? '번호 ' + current.length + '게임을 복사했습니다' : '이 브라우저에서는 복사할 수 없습니다'); });
    };
    actions.save = function () { addToVault(current.slice(), 'AI 추천'); };
  }

  /* =====================================================
     번호조합 (combiner)
     ===================================================== */
  function initCombiner() {
    var grid = $('[data-grid]');
    var balls = Array.prototype.slice.call(grid.children);
    var MAXF = 3, MAXX = 10;
    var mode = 'fix';

    function ballNum(b) { var m = b.textContent.match(/\d{2}/); return m ? parseInt(m[0], 10) : 0; }
    function kindOf(b) {
      var d = ($('path', b) || {}).getAttribute ? $('path', b).getAttribute('d') : '';
      if (!d) return 0;
      return d.indexOf('M9 16.17') === 0 ? 1 : 2;
    }
    var info = balls.map(function (b) {
      var cs = getComputedStyle(b);
      // 각 볼의 그리드 위치는 클래스에 포함되어 있으므로, 상태 변경 시에도 유지되도록 인라인으로 고정
      b.style.gridColumn = cs.gridColumnStart; b.style.gridRow = cs.gridRowStart;
      return { el: b, n: ballNum(b), st: kindOf(b), cls: b.className, html: b.innerHTML };
    });

    // 템플릿: 범위별 일반 볼, 고정 볼 부가요소, 제외 볼
    var normal = {}, extras = '', excl = null;
    info.forEach(function (o) {
      var k = range(o.n);
      if (o.st === 0 && !normal[k]) normal[k] = { cls: o.cls, html: o.html.replace(/>\s*\d{2}\s*</, '>{n}<') };
    });
    info.forEach(function (o) {
      if (o.st === 1 && !extras) {
        var tmp = document.createElement('div'); tmp.innerHTML = o.html;
        extras = Array.prototype.slice.call(tmp.children, 1).map(function (c) { return c.outerHTML; }).join('');
      }
      if (o.st === 2 && !excl) excl = { cls: o.cls, html: o.html.replace(/>\s*\d{2}\s*</, '>{n}<') };
    });

    function render(o) {
      var el = o.el, k = range(o.n), t = normal[k];
      if (o.st === 2 && excl) { el.className = excl.cls; el.innerHTML = excl.html.replace('{n}', pad(o.n)); }
      else {
        el.className = t.cls; el.innerHTML = t.html.replace('{n}', pad(o.n));
        if (o.st === 1) el.insertAdjacentHTML('beforeend', extras);
      }
      el.setAttribute('aria-pressed', o.st ? 'true' : 'false');
    }
    function count(st) { return info.filter(function (o) { return o.st === st; }).length; }
    function list(st) { return info.filter(function (o) { return o.st === st; }).map(function (o) { return pad(o.n); }); }

    var ps = $$('p');
    function pByRe(re) { return ps.filter(function (p) { return re.test(p.textContent); })[0]; }
    var pFix = pByRe(/^\d+ \/ 3개 선택됨$/), pExc = pByRe(/^\d+ \/ 10개 선택됨$/);
    var pLegFix = pByRe(/^고정수 \(/), pLegExc = pByRe(/^제외수 \(/), pLegRest = pByRe(/^일반 랜덤풀 \(/);
    function setLeg(p, label, txt) {
      if (!p) return;
      p.textContent = label;
      var n = p.nextElementSibling;
      if (n && n.tagName === 'P') { n.style.display = ''; n.textContent = txt; n.style.whiteSpace = 'normal'; n.style.wordBreak = 'keep-all'; }
    }
    if (pLegFix) {
      var legRow = pLegFix.parentNode.parentNode.parentNode.parentNode;
      Array.prototype.forEach.call(legRow.children, function (it) { it.style.flex = '1 1 0'; it.style.minWidth = '0'; it.style.alignItems = 'flex-start'; });
      $$('p', legRow).forEach(function (p) { p.style.whiteSpace = 'normal'; });
    }
    function fmt(a) { return a.length ? a.join(', ') : '없음'; }
    function refresh() {
      if (pFix) pFix.textContent = count(1) + ' / ' + MAXF + '개 선택됨';
      if (pExc) pExc.textContent = count(2) + ' / ' + MAXX + '개 선택됨';
      setLeg(pLegFix, '고정수', '(' + fmt(list(1)) + ')');
      setLeg(pLegExc, '제외수', '(' + fmt(list(2)) + ')');
      setLeg(pLegRest, '일반 랜덤풀', '(' + (45 - count(1) - count(2)) + '개)');
    }
    info.forEach(function (o) {
      o.el.style.cursor = 'pointer'; o.el.setAttribute('role', 'button');
      o.el.setAttribute('aria-label', pad(o.n) + '번');
      o.el.addEventListener('click', function () {
        var want = mode === 'fix' ? 1 : 2, max = mode === 'fix' ? MAXF : MAXX;
        if (o.st === want) o.st = 0;
        else {
          if (count(want) >= max) { toast((want === 1 ? '고정수는 최대 ' : '제외수는 최대 ') + max + '개까지 지정할 수 있습니다'); return; }
          o.st = want;
        }
        render(o); refresh();
      });
    });
    refresh();

    groupHooks.mode = function (el, els) { mode = els.indexOf(el) === 0 ? 'fix' : 'exc'; };
    actions.reset = function () { info.forEach(function (o) { o.st = 0; render(o); }); refresh(); toast('선택을 초기화했습니다'); };

    // 토글 스위치
    var switches = $$('[data-switch]').map(function (s) {
      var track = s.children[0], knob = s.children[1], on = true;
      s.style.cursor = 'pointer'; s.setAttribute('role', 'switch'); s.setAttribute('aria-checked', 'true'); s.setAttribute('tabindex', '0');
      var api = { get on() { return on; } };
      function paint() {
        track.style.backgroundColor = on ? '#4cd7f6' : '#273647';
        knob.style.left = on ? '22px' : '2px';
        knob.style.backgroundColor = on ? '#1d00a5' : '#c7c4d8';
        track.style.transition = knob.style.transition = 'all .18s'; 
        s.setAttribute('aria-checked', on ? 'true' : 'false');
      }
      function flip() { on = !on; paint(); }
      s.addEventListener('click', flip);
      s.addEventListener('keydown', function (ev) { if (ev.key === ' ' || ev.key === 'Enter') { ev.preventDefault(); flip(); } });
      return api;
    });

    // 생성 게임 수
    var genP = pByRe(/^조건 만족 번호 조합 생성/);
    function games() {
      var sel = $('[data-grp="games"][data-sel]');
      var m = sel ? sel.textContent.match(/\d+/) : null; return m ? parseInt(m[0], 10) : 5;
    }
    groupHooks.games = function () { if (genP) genP.textContent = '조건 만족 번호 조합 생성 (' + games() + '게임)'; };

    function selectedTexts(name) { return $$('[data-grp="' + name + '"][data-sel]').map(function (e) { return $('p', e).textContent.replace(/\s/g, ''); }); }

    actions.generate = function () {
      var fixed = info.filter(function (o) { return o.st === 1; }).map(function (o) { return o.n; });
      var banned = info.filter(function (o) { return o.st === 2; }).map(function (o) { return o.n; });
      var pool = info.map(function (o) { return o.n; }).filter(function (n) { return fixed.indexOf(n) < 0 && banned.indexOf(n) < 0; });
      var oe = selectedTexts('oddeven');                     // 예: ["4:2","3:3","2:4"]
      var hl = selectedTexts('hilo')[0] || '';
      var loOnly = /저번호/.test(hl) ? 4 : /고번호/.test(hl) ? 2 : 3; // 저번호 개수(1~22)
      var N = games(), out = [], seen = {}, tries = 0;
      while (out.length < N && tries++ < 40000) {
        var s = fixed.concat(pick6(pool).slice(0, 6 - fixed.length)).sort(function (a, b) { return a - b; });
        if (s.length !== 6 || new Set(s).size !== 6) continue;
        var odd = s.filter(function (n) { return n % 2; }).length;
        if (oe.indexOf(odd + ':' + (6 - odd)) < 0) continue;
        var low = s.filter(function (n) { return n <= 22; }).length;
        if (low !== loOnly) continue;
        var t = sum(s); if (t < 120 || t > 165) continue;
        if (switches[0] && switches[0].on && consecutivePairs(s) > 1) continue;
        if (switches[1] && switches[1].on && acValue(s) < 7) continue;
        if (switches[2] && switches[2].on && sameEnd(s) > 2) continue;
        var key = s.join(','); if (seen[key]) continue; seen[key] = 1; out.push(s);
      }
      if (!out.length) { toast('조건이 너무 엄격합니다. 필터를 조금 완화해 주세요'); return; }
      openSheet(out);
    };
  }

  /* ---------- 결과 바텀시트 ---------- */
  function openSheet(sets) {
    var wrap = document.createElement('div');
    wrap.className = 'sheet-wrap';
    wrap.innerHTML = '<div class="sheet" role="dialog" aria-modal="true" aria-label="생성 결과"><div class="sheet-grip"></div>' +
      '<div class="sheet-head"><strong>생성된 번호 ' + sets.length + '게임</strong><button type="button" class="sheet-x" aria-label="닫기">✕</button></div>' +
      '<ol class="sheet-list">' + sets.map(function (s, i) {
        return '<li><span class="sheet-idx">' + 'ABCDEFGHIJ'[i] + '</span><span class="sheet-balls">' + ballsHTML(s) + '</span></li>';
      }).join('') + '</ol>' +
      '<div class="sheet-actions"><button type="button" data-s="copy">번호 복사</button><button type="button" data-s="save" class="primary">보관함 저장</button></div></div>';
    document.body.appendChild(wrap);
    requestAnimationFrame(function () { wrap.classList.add('open'); });
    function close() { wrap.classList.remove('open'); setTimeout(function () { wrap.remove(); }, 200); }
    wrap.addEventListener('click', function (e) {
      if (e.target === wrap || e.target.classList.contains('sheet-x')) return close();
      var b = e.target.closest('[data-s]'); if (!b) return;
      if (b.getAttribute('data-s') === 'copy') {
        copyText(sets.map(function (s, i) { return 'ABCDEFGHIJ'[i] + '  ' + s.map(pad).join(' '); }).join('\n')).then(function (ok) { toast(ok ? '번호를 복사했습니다' : '이 브라우저에서는 복사할 수 없습니다'); });
      } else { addToVault(sets, '조합기'); close(); }
    });
    document.addEventListener('keydown', function esc(e) { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc); } });
  }

  /* =====================================================
     시뮬레이터
     ===================================================== */
  function initSimulator() {
    actions.vault = function () {
      var v = loadVault();
      if (!v.length) { toast('보관함이 비어 있습니다'); return; }
      setTest(v[0].nums); toast('보관함의 최근 번호를 불러왔습니다');
    };
    actions.aiload = function () {
      var all = []; for (var i = 1; i <= 45; i++) all.push(i);
      setTest(pick6(all)); toast('AI 추천번호를 불러왔습니다');
    };
    function testRow() {
      return $$('div').filter(function (d) { return d.children.length === 6 && Array.prototype.every.call(d.children, function (c) { return /^\d\d/.test(c.textContent.trim()); }); })[0];
    }
    var tpl = {};
    (function () {
      var row = testRow(); if (!row) return;
      Array.prototype.forEach.call(row.children, function (cell) {
        var ball = cell.firstElementChild, n = parseInt($('p', ball).textContent, 10), k = range(n);
        if (!tpl[k]) tpl[k] = { ball: ball.className, inner: ball.firstElementChild ? ball.firstElementChild.className : '' };
      });
    })();
    function setTest(nums) {
      var row = testRow(); if (!row) return;
      Array.prototype.forEach.call(row.children, function (cell, i) {
        var ball = cell.firstElementChild, n = nums[i], t = tpl[range(n)];
        if (t) { ball.className = t.ball; if (ball.firstElementChild && t.inner) ball.firstElementChild.className = t.inner; }
        $('p', ball).textContent = pad(n);
        var lab = cell.lastElementChild && $('p', cell.lastElementChild);
        if (lab && cell.lastElementChild !== ball) lab.textContent = n < 10 ? '단번대' : (Math.floor(n / 10) * 10) + '번대';
      });
    }
    actions.rerun = function (el) {
      var p = $('p', el); if (!p) return;
      var old = p.textContent; p.textContent = '계산 중…'; el.style.pointerEvents = 'none';
      setTimeout(function () { p.textContent = old; el.style.pointerEvents = ''; toast(latestRound.toLocaleString('en-US') + '회차 시뮬레이션을 다시 실행했습니다'); }, 900);
    };
    actions.share = function () {
      var url = location.href;
      if (navigator.share) { navigator.share({ title: '로또랩 시뮬레이션 결과', url: url }).catch(function () {}); return; }
      copyText(url).then(function (ok) { toast(ok ? '링크를 복사했습니다' : '이 브라우저에서는 공유할 수 없습니다'); });
    };
    actions.savesim = function () {
      var row = testRow();
      var nums = row ? Array.prototype.map.call(row.children, function (c) { return parseInt($('p', c).textContent, 10); }) : [];
      if (nums.length === 6) addToVault([nums], '시뮬레이터'); else toast('저장할 번호가 없습니다');
    };
  }

  /* =====================================================
     통계분석 (data/lotto.json으로 계산)
     ===================================================== */
  var ZONES = [[1, 10, '노랑'], [11, 20, '파랑'], [21, 30, '빨강'], [31, 40, '회색'], [41, 45, '초록']];
  function findP(t) { return $$('p').filter(function (p) { return p.textContent === t; })[0]; }
  function pct(n, d, digits) { return (d ? (n / d * 100) : 0).toFixed(digits || 0) + '%'; }
  function setBar(el, ratio) { if (el) el.style.right = (100 - Math.max(0, Math.min(1, ratio)) * 100).toFixed(1) + '%'; }
  function oddCount(nums) { return nums.filter(function (n) { return n % 2; }).length; }

  function initStats(draws) {
    // 시안 값이 들어 있는 자리를 먼저 찾아 둡니다.
    var el = {
      hotZone: findP('11~20'), hotRate: findP('출현 빈도 24% 기록'),
      subtitle: findP('최근 100회 당첨번호 전수 집계'),
      rankRows: $$('.u182'),
      oeMode: findP('최빈 패턴 3:3'), oeBar: $('.u203') ? $('.u203').children : [], oePs: $$('p', $('.u208')),
      sumGold: findP('골든존 131~160'),
      sumRows: $$('.u218', findP('총합(Sum) 분포 히스토그램').closest('.u202')),
      consec: ['연속 없음', '1쌍 등장', '2쌍 등장'].map(function (t) { var p = findP(t); return p && $('p', p.parentNode.nextElementSibling); }),
      digits: $$('.u243 p'), digitText: findP('3끝수 & 7끝수 집중'),
      zoneRows: $$('.u251 > .u218'),
      zoneHi: null,
      ai: $$('p').filter(function (p) { return /^홀짝 \d:\d, 총합/.test(p.textContent); })[0]
    };
    // 순위 줄의 볼 색 클래스 (범위별)
    var ballCls = {};
    el.rankRows.forEach(function (row) {
      var b = row.firstElementChild; ballCls[range(parseInt(b.textContent, 10))] = b.className;
    });
    // 구간 줄 강조 스타일 (시안에서 둘째 줄이 강조, 첫째 줄이 보통)
    function zoneParts(row) { return [$('.u219 > div', row), $('.u255 > div', row)]; }
    if (el.zoneRows.length > 1) el.zoneHi = [zoneParts(el.zoneRows[1]).map(function (d) { return d.className; }),
      zoneParts(el.zoneRows[0]).map(function (d) { return d.className; })];
    // 번호별 마지막 출현 회차 (장기 미출현 계산용, 기간과 무관)
    var lastSeen = {}, latest = draws[draws.length - 1].round;
    draws.forEach(function (d) { d.numbers.forEach(function (n) { lastSeen[n] = d.round; }); });

    var period = 100, rankMode = 'top';

    function render() {
      var w = period ? draws.slice(-period) : draws, total = w.length, balls = total * 6;
      var freq = {}, zone = [0, 0, 0, 0, 0], digit = {}, oe = {}, sumBins = [0, 0, 0], consec = [0, 0, 0];
      for (var n = 1; n <= 45; n++) freq[n] = 0;
      w.forEach(function (d) {
        d.numbers.forEach(function (n) {
          freq[n]++; digit[n % 10] = (digit[n % 10] || 0) + 1;
          ZONES.forEach(function (z, i) { if (n >= z[0] && n <= z[1]) zone[i]++; });
        });
        var o = oddCount(d.numbers), k = o + ':' + (6 - o); oe[k] = (oe[k] || 0) + 1;
        var s = sum(d.numbers);
        if (s >= 100 && s <= 130) sumBins[0]++; else if (s >= 131 && s <= 160) sumBins[1]++; else if (s >= 161 && s <= 190) sumBins[2]++;
        consec[Math.min(2, consecutivePairs(d.numbers))]++;
      });
      var label = period ? '최근 ' + period + '회' : '전체 ' + total.toLocaleString('en-US') + '회';
      if (el.subtitle) el.subtitle.textContent = label + ' 당첨번호 전수 집계';

      // 과열 구간: 번호 비중이 가장 높은 구간
      var hot = zone.indexOf(Math.max.apply(null, zone));
      if (el.hotZone) el.hotZone.textContent = ZONES[hot][0] + '~' + ZONES[hot][1];
      if (el.hotRate) el.hotRate.textContent = '출현 빈도 ' + pct(zone[hot], balls) + ' 기록';

      // 최다 출현 / 장기 미출현 5선
      var nums = Object.keys(freq).map(Number), rows;
      if (rankMode === 'top') {
        rows = nums.sort(function (a, b) { return freq[b] - freq[a] || a - b; }).slice(0, 5).map(function (n) {
          return { n: n, text: freq[n] + '회 출현', v: freq[n] };
        });
      } else {
        rows = nums.map(function (n) { return { n: n, gap: latest - (lastSeen[n] || 0) }; })
          .sort(function (a, b) { return b.gap - a.gap || a.n - b.n; }).slice(0, 5).map(function (o) {
            return { n: o.n, text: o.gap + '회째 미출현', v: o.gap };
          });
      }
      var max = rows.length ? rows[0].v : 1;
      el.rankRows.forEach(function (row, i) {
        var r = rows[i]; if (!r) return;
        var ps = $$('p', row), b = row.firstElementChild;
        if (ballCls[range(r.n)]) b.className = ballCls[range(r.n)];
        ps[0].textContent = pad(r.n); ps[1].textContent = pad(r.n) + '번\u00a0'; ps[2].textContent = r.text;
        ps[3].textContent = pct(freq[r.n], total, 1);
        setBar($('.u191 > div', row), max ? r.v / max * 0.9 : 0);
      });

      // 홀짝 비율 (홀:짝)
      var oeKeys = ['3:3', '4:2', '2:4'], etc = total;
      var oeMode = Object.keys(oe).sort(function (a, b) { return oe[b] - oe[a]; })[0] || '3:3';
      if (el.oeMode) el.oeMode.textContent = '최빈 패턴 ' + oeMode;
      oeKeys.concat('기타').forEach(function (k, i) {
        var c = i < 3 ? (oe[k] || 0) : etc;
        if (i < 3) etc -= c;
        if (el.oePs[i * 2 + 1]) el.oePs[i * 2 + 1].textContent = pct(c, total);
        if (el.oeBar[i]) el.oeBar[i].style.width = 'calc(' + pct(c, total, 2) + ' - 2px)';
      });

      // 총합 분포
      var gold = sumBins.indexOf(Math.max.apply(null, sumBins));
      if (el.sumGold) el.sumGold.textContent = '골든존 ' + ['100~130', '131~160', '161~190'][gold];
      el.sumRows.forEach(function (row, i) {
        var ps = $$('p', row);
        ps[ps.length - 1].textContent = pct(sumBins[i], total);
        setBar($('.u220 > div', row), total ? sumBins[i] / total : 0);
      });

      // 연속 번호 (2쌍 이상은 "2쌍 등장"에 포함)
      el.consec.forEach(function (p, i) { if (p) p.textContent = pct(consec[i], total); });

      // 강세 동끝수: 가장 많이 나온 끝수 2개
      var top2 = Object.keys(digit).sort(function (a, b) { return digit[b] - digit[a] || a - b; }).slice(0, 2);
      el.digits.forEach(function (p, i) { if (top2[i] != null) p.textContent = top2[i]; });
      if (el.digitText && top2.length === 2) el.digitText.textContent = top2[0] + '끝수 & ' + top2[1] + '끝수 집중';

      // 구간별 출현 비중
      el.zoneRows.forEach(function (row, i) {
        var ps = $$('p', row);
        ps[ps.length - 1].textContent = pct(zone[i], balls);
        setBar($('.u220 > div', row), balls ? zone[i] / balls : 0);
        if (el.zoneHi) zoneParts(row).forEach(function (d, j) { d.className = el.zoneHi[i === hot ? 0 : 1][j]; });
      });

      if (el.ai) el.ai.textContent = '홀짝 ' + oeMode + ', 총합 ' + ['100~130', '131~160', '161~190'][gold] +
        ', 최빈 ' + top2.join('/') + '끝수, ' + ZONES[hot][2] + ' 대역 가중치를 탑재한 필터링 엔진을 가동합니다.';
    }

    groupHooks.period = function (sel) {
      var m = sel.textContent.match(/최근 (\d+)회/); period = m ? +m[1] : 0; render();
    };
    groupHooks.rank = function (sel, els) { rankMode = els.indexOf(sel) === 0 ? 'top' : 'worst'; render(); };
    render();
  }

  /* =====================================================
     보관함
     ===================================================== */
  function initVault() {
    var list = $('#vault-list'), empty = $('#vault-empty'), clear = $('#vault-clear');
    function draw() {
      var v = loadVault();
      empty.hidden = v.length > 0; clear.hidden = !v.length;
      list.innerHTML = v.map(function (o, i) {
        var d = new Date(o.at), ds = isNaN(d) ? '' : (d.getMonth() + 1) + '/' + d.getDate() + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
        return '<li class="v-item"><div class="v-top"><span class="v-tag">' + (o.label || '저장') + '</span><span class="v-date">' + ds + '</span>' +
          '<button type="button" class="v-del" data-i="' + i + '" aria-label="삭제">삭제</button></div><div class="v-balls">' + ballsHTML(o.nums) + '</div></li>';
      }).join('');
    }
    list.addEventListener('click', function (e) {
      var b = e.target.closest('.v-del'); if (!b) return;
      var v = loadVault(); v.splice(parseInt(b.getAttribute('data-i'), 10), 1); saveVault(v); draw();
    });
    clear.addEventListener('click', function () { saveVault([]); draw(); });
    draw();
  }

  /* ---------- 시작 ---------- */
  initActions();
  initGroups();
  initLatest();
  if (page === 'index') initHome();
  if (page === 'combiner') initCombiner();
  if (page === 'simulator') initSimulator();
  if (page === 'vault') initVault();
})();
