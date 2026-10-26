/* 로또랩 - 억지 분석 규칙
   당첨번호를 "보고 나서" 끼워 맞춘 규칙 모음입니다. 재미와 기록용이며 예측에 쓰지 않습니다.
   - 사이트(통계 탭)와 GitHub 기록(scripts/analyze.mjs)이 이 파일 하나를 같이 씁니다.
   - 규칙을 추가할 때는 맨 아래에 붙이고 since에 "그 규칙을 만든 회차"를 적습니다.
     since 이전 결과는 끼워 맞춘 기록이고, since 다음 회차부터가 진짜 성적입니다.
   - test(c)는 맞으면 짧은 근거 문자열(예: "1+2+4+7=14"), 아니면 빈 문자열을 돌려줍니다.
     c: { d: 이번 회차, prev: 직전 회차, i: 위치, draws: 전체, past: 이번 회차 이전까지의 누적 정보 } */
(function (root) {
  'use strict';

  var PRIMES = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43];
  var FIB = [1, 2, 3, 5, 8, 13, 21, 34];
  var SQUARES = [1, 4, 9, 16, 25, 36];
  var ZONES = [[1, 10], [11, 20], [21, 30], [31, 40], [41, 45]];

  function sum(a) { return a.reduce(function (x, y) { return x + y; }, 0); }
  function digitSum(n) { return String(n).split('').reduce(function (x, y) { return x + +y; }, 0); }
  function has(a, n) { return a.indexOf(n) >= 0; }
  function zoneKey(a) { return ZONES.map(function (z) { return a.filter(function (n) { return n >= z[0] && n <= z[1]; }).length; }).join('-'); }
  // 숫자를 뒤집은 수 (24→42). 한 자리 수와 10·20·30·40처럼 끝이 0인 수는 뒤집지 않습니다.
  function mirror(n) { if (n < 10 || n % 10 === 0) return 0; var m = +String(n).split('').reverse().join(''); return m <= 45 && m !== n ? m : 0; }
  function runs(a) { var best = 1, cur = 1; for (var i = 1; i < a.length; i++) { cur = a[i] - a[i - 1] === 1 ? cur + 1 : 1; if (cur > best) best = cur; } return best; }
  function ac(a) { var s = {}; for (var i = 0; i < a.length; i++) for (var j = i + 1; j < a.length; j++) s[a[j] - a[i]] = 1; return Object.keys(s).length - (a.length - 1); }
  function pairs(a, fn) { var out = []; for (var i = 0; i < a.length; i++) for (var j = i + 1; j < a.length; j++) { var r = fn(a[i], a[j]); if (r) out.push(r); } return out; }
  function list(a, sep) { return a.join(sep || ', '); }
  function day(d) { return +d.date.slice(8, 10); }
  function month(d) { return +d.date.slice(5, 7); }
  function inRange(n) { return n >= 1 && n <= 45; }

  var RULES = [
    // ---------- 날짜·회차로 끼워 맞추기 ----------
    { id: 'round-digit-sum', group: '날짜·회차', since: 1247, name: '회차 자릿수 합이 당첨번호에',
      desc: '회차 번호의 각 자리를 더한 값이 당첨번호에 있어요.',
      test: function (c) { var s = digitSum(c.d.round); return has(c.d.numbers, s) ? String(c.d.round).split('').join('+') + '=' + s : ''; } },
    { id: 'sum-digit-sum', group: '날짜·회차', since: 1247, name: '번호 합의 자릿수 합이 당첨번호에',
      desc: '당첨번호 6개를 더하고, 그 값의 자리를 다시 더한 값이 당첨번호에 있어요.',
      test: function (c) { var t = sum(c.d.numbers), s = digitSum(t); return has(c.d.numbers, s) ? '합 ' + t + ' → ' + String(t).split('').join('+') + '=' + s : ''; } },
    { id: 'day-is-bonus', group: '날짜·회차', since: 1247, name: '추첨일(일)이 보너스 번호',
      desc: '추첨한 날짜의 "일"이 보너스 번호와 같아요.',
      test: function (c) { return day(c.d) === c.d.bonus ? c.d.date.slice(5).replace('-', '월 ') + '일 = 보너스 ' + c.d.bonus : ''; } },
    { id: 'day-in', group: '날짜·회차', since: 1247, name: '추첨일(일)이 당첨번호에',
      desc: '추첨한 날짜의 "일"이 당첨번호 6개 안에 있어요.',
      test: function (c) { return has(c.d.numbers, day(c.d)) ? day(c.d) + '일' : ''; } },
    { id: 'month-in', group: '날짜·회차', since: 1247, name: '추첨 월이 당첨번호에',
      desc: '추첨한 달(1~12)이 당첨번호에 있어요.',
      test: function (c) { return has(c.d.numbers, month(c.d)) ? month(c.d) + '월' : ''; } },
    { id: 'month-day-sum', group: '날짜·회차', since: 1247, name: '월+일이 당첨번호에',
      desc: '추첨한 달과 일을 더한 값이 당첨번호(또는 보너스)에 있어요.',
      test: function (c) { var s = month(c.d) + day(c.d); return has(c.d.numbers, s) || c.d.bonus === s ? month(c.d) + '+' + day(c.d) + '=' + s : ''; } },
    { id: 'round-mod-45', group: '날짜·회차', since: 1247, name: '회차 ÷ 45 나머지가 당첨번호에',
      desc: '회차를 45로 나눈 나머지(0이면 45)가 당첨번호에 있어요.',
      test: function (c) { var r = c.d.round % 45 || 45; return has(c.d.numbers, r) ? c.d.round + '÷45 나머지 ' + r : ''; } },
    { id: 'round-digits-2', group: '날짜·회차', since: 1247, name: '회차의 숫자 2개 이상이 당첨번호에',
      desc: '회차를 이루는 숫자(0 제외) 중 2개 이상이 그대로 당첨번호에 있어요. 예: 1247회 → 1·2·4·7',
      test: function (c) { var ds = String(c.d.round).split('').map(Number).filter(function (x, k, a) { return x && a.indexOf(x) === k; }); var h = ds.filter(function (x) { return has(c.d.numbers, x); }); return h.length >= 2 ? list(h) : ''; } },

    // ---------- 산수로 끼워 맞추기 ----------
    { id: 'a-plus-b', group: '산수', since: 1247, name: '두 번호의 합이 다른 당첨번호',
      desc: '당첨번호 두 개를 더하면 또 다른 당첨번호가 돼요.',
      test: function (c) { var N = c.d.numbers; return list(pairs(N, function (a, b) { return has(N, a + b) ? a + '+' + b + '=' + (a + b) : ''; })); } },
    { id: 'double', group: '산수', since: 1247, name: '어떤 번호의 두 배가 함께',
      desc: '당첨번호 중 하나의 두 배가 같이 나왔어요.',
      test: function (c) { var N = c.d.numbers; return list(N.filter(function (n) { return has(N, n * 2); }).map(function (n) { return n + '×2=' + n * 2; })); } },
    { id: 'triple', group: '산수', since: 1247, name: '어떤 번호의 세 배가 함께',
      desc: '당첨번호 중 하나의 세 배가 같이 나왔어요.',
      test: function (c) { var N = c.d.numbers; return list(N.filter(function (n) { return has(N, n * 3); }).map(function (n) { return n + '×3=' + n * 3; })); } },
    { id: 'pair-sum-bonus', group: '산수', since: 1247, name: '두 번호의 합이 보너스',
      desc: '당첨번호 두 개를 더하면 보너스 번호가 돼요.',
      test: function (c) { var b = c.d.bonus; return list(pairs(c.d.numbers, function (x, y) { return x + y === b ? x + '+' + y + '=' + b : ''; })); } },
    { id: 'pair-diff-bonus', group: '산수', since: 1247, name: '두 번호의 차가 보너스',
      desc: '당첨번호 두 개의 차이가 보너스 번호와 같아요.',
      test: function (c) { var b = c.d.bonus; return list(pairs(c.d.numbers, function (x, y) { return y - x === b ? y + '-' + x + '=' + b : ''; })); } },
    { id: 'no-prime', group: '산수', since: 1247, name: '소수가 하나도 없음',
      desc: '당첨번호 6개 중 소수(2, 3, 5, 7, 11 …)가 하나도 없어요.',
      test: function (c) { return c.d.numbers.every(function (n) { return !has(PRIMES, n); }) ? '소수 0개' : ''; } },
    { id: 'prime-3', group: '산수', since: 1247, name: '소수가 3개 이상',
      desc: '당첨번호 중 소수가 3개 이상이에요.',
      test: function (c) { var p = c.d.numbers.filter(function (n) { return has(PRIMES, n); }); return p.length >= 3 ? list(p) : ''; } },
    { id: 'mult7-3', group: '산수', since: 1247, name: '7의 배수가 3개 이상',
      desc: '7, 14, 21, 28, 35, 42 중 3개 이상이 나왔어요.',
      test: function (c) { var p = c.d.numbers.filter(function (n) { return n % 7 === 0; }); return p.length >= 3 ? list(p) : ''; } },
    { id: 'mult3-3', group: '산수', since: 1247, name: '3의 배수가 3개 이상',
      desc: '3의 배수가 3개 이상 나왔어요.',
      test: function (c) { var p = c.d.numbers.filter(function (n) { return n % 3 === 0; }); return p.length >= 3 ? list(p) : ''; } },
    { id: 'mult5-2', group: '산수', since: 1247, name: '5의 배수가 2개 이상',
      desc: '5, 10, 15 … 45 중 2개 이상이 나왔어요.',
      test: function (c) { var p = c.d.numbers.filter(function (n) { return n % 5 === 0; }); return p.length >= 2 ? list(p) : ''; } },
    { id: 'twin', group: '산수', since: 1247, name: '쌍둥이 수(11·22·33·44) 포함',
      desc: '같은 숫자가 두 번 쓰인 번호가 나왔어요.',
      test: function (c) { return list(c.d.numbers.filter(function (n) { return n % 11 === 0; })); } },
    { id: 'fib-2', group: '산수', since: 1247, name: '피보나치 수가 2개 이상',
      desc: '1, 2, 3, 5, 8, 13, 21, 34 중 2개 이상이 나왔어요.',
      test: function (c) { var p = c.d.numbers.filter(function (n) { return has(FIB, n); }); return p.length >= 2 ? list(p) : ''; } },
    { id: 'square-2', group: '산수', since: 1247, name: '제곱수가 2개 이상',
      desc: '1, 4, 9, 16, 25, 36 중 2개 이상이 나왔어요.',
      test: function (c) { var p = c.d.numbers.filter(function (n) { return has(SQUARES, n); }); return p.length >= 2 ? list(p) : ''; } },
    { id: 'sum-palindrome', group: '산수', since: 1247, name: '번호 합이 거꾸로 읽어도 같은 수',
      desc: '당첨번호 6개의 합이 121, 131처럼 앞뒤가 같은 수예요.',
      test: function (c) { var s = String(sum(c.d.numbers)); return s === s.split('').reverse().join('') ? '합 ' + s : ''; } },

    // ---------- 직전 회차와 엮기 ----------
    { id: 'carry-1', group: '직전 회차', since: 1247, name: '직전 회차 번호가 다시 나옴(이월수)',
      desc: '바로 전 회차 당첨번호 중 1개 이상이 또 나왔어요.',
      test: function (c) { return c.prev ? list(c.d.numbers.filter(function (n) { return has(c.prev.numbers, n); })) : ''; } },
    { id: 'carry-2', group: '직전 회차', since: 1247, name: '이월수 2개 이상',
      desc: '바로 전 회차 당첨번호 중 2개 이상이 또 나왔어요.',
      test: function (c) { if (!c.prev) return ''; var h = c.d.numbers.filter(function (n) { return has(c.prev.numbers, n); }); return h.length >= 2 ? list(h) : ''; } },
    { id: 'neighbor-2', group: '직전 회차', since: 1247, name: '직전 번호의 이웃수(±1) 2개 이상',
      desc: '바로 전 회차 번호보다 1 크거나 작은 번호가 2개 이상 나왔어요.',
      test: function (c) { if (!c.prev) return ''; var h = c.d.numbers.filter(function (n) { return has(c.prev.numbers, n - 1) || has(c.prev.numbers, n + 1); }); return h.length >= 2 ? list(h) : ''; } },
    { id: 'prev-bonus-in', group: '직전 회차', since: 1247, name: '직전 보너스가 이번 당첨번호에',
      desc: '바로 전 회차의 보너스 번호가 이번엔 당첨번호로 나왔어요.',
      test: function (c) { return c.prev && has(c.d.numbers, c.prev.bonus) ? '직전 보너스 ' + c.prev.bonus : ''; } },
    { id: 'bonus-from-prev', group: '직전 회차', since: 1247, name: '이번 보너스가 직전 당첨번호',
      desc: '이번 보너스 번호가 바로 전 회차의 당첨번호 중 하나예요.',
      test: function (c) { return c.prev && has(c.prev.numbers, c.d.bonus) ? '보너스 ' + c.d.bonus : ''; } },
    { id: 'mirror-prev-2', group: '직전 회차', since: 1247, name: '직전 번호를 뒤집은 수(거울수) 2개 이상',
      desc: '이번 번호의 숫자를 뒤집으면(24↔42) 바로 전 회차 번호가 되는 게 2개 이상이에요. 22처럼 같은 숫자는 그대로 이월된 것도 셉니다.',
      test: function (c) { if (!c.prev) return ''; var h = c.d.numbers.filter(function (n) { var m = mirror(n); return (m && has(c.prev.numbers, m)) || (n % 11 === 0 && has(c.prev.numbers, n)); }); return h.length >= 2 ? list(h.map(function (n) { var m = mirror(n) || n; return n + '↔' + m; })) : ''; } },
    { id: 'sum-up', group: '직전 회차', since: 1247, name: '번호 합이 직전보다 커짐',
      desc: '당첨번호 합이 바로 전 회차보다 커졌어요. (원래 반반인 동전 던지기 같은 규칙)',
      test: function (c) { if (!c.prev) return ''; var a = sum(c.prev.numbers), b = sum(c.d.numbers); return b > a ? a + '→' + b : ''; } },

    // ---------- 지난 기록과 엮기 ----------
    { id: 'back-52', group: '지난 기록', since: 1247, name: '52회 전(약 1년 전)과 겹침',
      desc: '정확히 52회 전 당첨번호와 1개 이상 같아요.',
      test: function (c) { var o = c.draws[c.i - 52]; if (!o) return ''; var h = c.d.numbers.filter(function (n) { return has(o.numbers, n); }); return h.length ? o.round + '회: ' + list(h) : ''; } },
    { id: 'back-100', group: '지난 기록', since: 1247, name: '100회 전과 겹침',
      desc: '정확히 100회 전 당첨번호와 1개 이상 같아요.',
      test: function (c) { var o = c.draws[c.i - 100]; if (!o) return ''; var h = c.d.numbers.filter(function (n) { return has(o.numbers, n); }); return h.length ? o.round + '회: ' + list(h) : ''; } },
    { id: 'old-four', group: '지난 기록', since: 1247, name: '예전 어떤 회차와 4개 이상 일치',
      desc: '지난 회차 중 하나와 당첨번호가 4개 이상 같아요.',
      test: function (c) { var hits = []; combos4(c.d.numbers).forEach(function (k) { if (c.past.quads[k]) hits.push(c.past.quads[k] + '회(' + k.split(',').join('·') + ')'); }); return hits.slice(0, 2).join(', '); } },
    { id: 'old-triple', group: '지난 기록', since: 1247, name: '예전에 함께 나온 3개 묶음 포함',
      desc: '이번 번호 중 3개가 예전 어떤 회차에서도 같이 나온 적이 있어요.',
      test: function (c) { var hit = ''; combos3(c.d.numbers).some(function (k) { if (c.past.trios[k]) { hit = k.split(',').join('·') + ' (' + c.past.trios[k] + '회)'; return true; } return false; }); return hit; } },
    { id: 'buddy-pair', group: '지난 기록', since: 1247, name: '단짝 쌍(역대 20회 이상 함께) 포함',
      desc: '예전에 20번 이상 같이 나온 두 번호가 또 함께 나왔어요.',
      test: function (c) { var best = null; pairs(c.d.numbers, function (a, b) { var k = a + ',' + b, n = c.past.pairs[k] || 0; if (n >= 20 && (!best || n > best[1])) best = [a + '-' + b, n]; return ''; }); return best ? best[0] + ' (' + best[1] + '번째 동반)' : ''; } },
    { id: 'hot-in', group: '지난 기록', since: 1247, name: '최근 100회 최다 출현 TOP 5 포함',
      desc: '직전까지 100회 동안 가장 많이 나온 번호 5개 중 하나가 나왔어요.',
      test: function (c) { var t = topBy(c.past.recent100, 5, true); return list(c.d.numbers.filter(function (n) { return has(t, n); })); } },
    { id: 'cold-in', group: '지난 기록', since: 1247, name: '최근 100회 최소 출현 5개 포함',
      desc: '직전까지 100회 동안 가장 적게 나온 번호 5개 중 하나가 나왔어요.',
      test: function (c) { var t = topBy(c.past.recent100, 5, false); return list(c.d.numbers.filter(function (n) { return has(t, n); })); } },
    { id: 'long-absent', group: '지난 기록', since: 1247, name: '20회 넘게 쉰 번호가 나옴',
      desc: '20회 넘게 나오지 않던 번호가 나왔어요.',
      test: function (c) { return list(c.d.numbers.filter(function (n) { return c.past.lastSeen[n] && c.d.round - c.past.lastSeen[n] > 20; }).map(function (n) { return n + '(' + (c.d.round - c.past.lastSeen[n]) + '회 만)'; })); } },
    { id: 'cold-4', group: '지난 기록', since: 1247, name: '10회 넘게 쉰 번호가 4개 이상',
      desc: '10회 넘게 나오지 않던 번호가 4개 이상 한꺼번에 나왔어요.',
      test: function (c) { var h = c.d.numbers.filter(function (n) { return !c.past.lastSeen[n] || c.d.round - c.past.lastSeen[n] > 10; }); return h.length >= 4 ? list(h) : ''; } },
    { id: 'rare-shape', group: '지난 기록', since: 1247, name: '보기 드문 구간 구성(역대 1% 미만)',
      desc: '1~10/11~20/21~30/31~40/41~45에 몇 개씩 나왔는지의 모양이 예전엔 1% 미만이었어요.',
      test: function (c) { if (c.i < 100) return ''; var k = zoneKey(c.d.numbers), n = c.past.shapes[k] || 0; return n / c.i < 0.01 ? k + ' (예전 ' + n + '번)' : ''; } },

    // ---------- 모양으로 끼워 맞추기 ----------
    { id: 'empty-30s', group: '모양', since: 1247, name: '31~40이 텅 빔',
      desc: '31부터 40 사이 번호가 하나도 없어요.',
      test: function (c) { return c.d.numbers.every(function (n) { return n < 31 || n > 40; }) ? '31~40: 0개' : ''; } },
    { id: 'empty-zone', group: '모양', since: 1247, name: '비어 있는 구간이 있음',
      desc: '1~10, 11~20, 21~30, 31~40, 41~45 중 하나도 안 나온 구간이 있어요.',
      test: function (c) { var e = ZONES.filter(function (z) { return !c.d.numbers.some(function (n) { return n >= z[0] && n <= z[1]; }); }).map(function (z) { return z[0] + '~' + z[1]; }); return list(e); } },
    { id: 'consecutive', group: '모양', since: 1247, name: '연속 번호 있음',
      desc: '12·13처럼 이어지는 번호가 있어요.',
      test: function (c) { var N = c.d.numbers, h = []; for (var k = 1; k < 6; k++) if (N[k] - N[k - 1] === 1) h.push(N[k - 1] + '·' + N[k]); return list(h); } },
    { id: 'run-3', group: '모양', since: 1247, name: '3개 이상 연속',
      desc: '12·13·14처럼 3개 이상 이어지는 번호가 있어요.',
      test: function (c) { return runs(c.d.numbers) >= 3 ? runs(c.d.numbers) + '연속' : ''; } },
    { id: 'same-end-3', group: '모양', since: 1247, name: '같은 끝자리 3개 이상',
      desc: '3·13·23처럼 끝자리가 같은 번호가 3개 이상이에요.',
      test: function (c) { var m = {}; c.d.numbers.forEach(function (n) { (m[n % 10] = m[n % 10] || []).push(n); }); var g = Object.keys(m).map(function (k) { return m[k]; }).filter(function (a) { return a.length >= 3; }); return g.length ? list(g[0], '·') : ''; } },
    { id: 'single-to-45', group: '모양', since: 1247, name: '한 자리 수로 시작해 45로 끝남',
      desc: '가장 작은 번호가 한 자리 수이고, 가장 큰 번호가 45예요.',
      test: function (c) { var N = c.d.numbers; return N[0] < 10 && N[5] === 45 ? N[0] + ' … 45' : ''; } },
    { id: 'wide-span', group: '모양', since: 1247, name: '가장 작은 수와 큰 수 차이 35 이상',
      desc: '첫 번호와 끝 번호의 차이가 35 이상으로 넓게 퍼졌어요.',
      test: function (c) { var N = c.d.numbers; return N[5] - N[0] >= 35 ? N[0] + '~' + N[5] + ' (폭 ' + (N[5] - N[0]) + ')' : ''; } },
    { id: 'big-gap', group: '모양', since: 1247, name: '이웃한 번호 사이가 20 이상 벌어짐',
      desc: '크기순으로 놓았을 때 바로 옆 번호와 20 이상 차이 나는 곳이 있어요.',
      test: function (c) { var N = c.d.numbers, h = []; for (var k = 1; k < 6; k++) if (N[k] - N[k - 1] >= 20) h.push(N[k - 1] + '→' + N[k]); return list(h); } },
    { id: 'low-4', group: '모양', since: 1247, name: '낮은 번호(1~22)가 4개 이상',
      desc: '22 이하 번호가 4개 이상이에요.',
      test: function (c) { var h = c.d.numbers.filter(function (n) { return n <= 22; }); return h.length >= 4 ? list(h) : ''; } },
    { id: 'even-4', group: '모양', since: 1247, name: '짝수가 4개 이상',
      desc: '당첨번호 중 짝수가 4개 이상이에요.',
      test: function (c) { var h = c.d.numbers.filter(function (n) { return n % 2 === 0; }); return h.length >= 4 ? list(h) : ''; } },
    { id: 'ac-10', group: '모양', since: 1247, name: '번호 간 차이가 최대로 다양함(AC 10)',
      desc: '번호 두 개씩 뺀 차이 15개가 가장 다양한 경우(AC값 10)예요.',
      test: function (c) { return ac(c.d.numbers) === 10 ? 'AC 10' : ''; } },
    { id: 'all-ends-differ', group: '모양', since: 1247, name: '끝자리가 모두 다름',
      desc: '6개 번호의 끝자리가 하나도 겹치지 않아요.',
      test: function (c) { var e = c.d.numbers.map(function (n) { return n % 10; }); return e.every(function (x, k) { return e.indexOf(x) === k; }) ? '끝자리 ' + e.join('') : ''; } }
  ];

  function combos3(N) { var o = []; for (var a = 0; a < 6; a++) for (var b = a + 1; b < 6; b++) for (var c = b + 1; c < 6; c++) o.push(N[a] + ',' + N[b] + ',' + N[c]); return o; }
  function combos4(N) { var o = []; for (var a = 0; a < 6; a++) for (var b = a + 1; b < 6; b++) for (var c = b + 1; c < 6; c++) for (var d = c + 1; d < 6; d++) o.push(N[a] + ',' + N[b] + ',' + N[c] + ',' + N[d]); return o; }
  function topBy(freq, k, most) {
    var nums = []; for (var n = 1; n <= 45; n++) nums.push(n);
    nums.sort(function (a, b) { return most ? (freq[b] || 0) - (freq[a] || 0) || a - b : (freq[a] || 0) - (freq[b] || 0) || a - b; });
    return nums.slice(0, k);
  }

  /* 전체 회차에 모든 규칙을 적용합니다. 회차를 오래된 순서로 돌며 "이전까지의 누적 정보"를 쌓으므로 한 번에 끝납니다.
     돌려주는 값: { rounds: [회차…], rules: [{ id, name, desc, group, since, hits: [근거 또는 ''], total, rate,
                    before: {hit, n}, after: {hit, n}, recent10, streak }], perRound: [회차별 적중 개수] } */
  function evaluate(draws) {
    var past = { lastSeen: {}, pairs: {}, trios: {}, quads: {}, shapes: {}, recent100: {} };
    var out = RULES.map(function (r) { return { id: r.id, name: r.name, desc: r.desc, group: r.group, since: r.since, hits: [] }; });
    var perRound = [];
    draws.forEach(function (d, i) {
      var c = { d: d, prev: draws[i - 1] || null, i: i, draws: draws, past: past }, count = 0;
      RULES.forEach(function (r, k) { var h = ''; try { h = r.test(c) || ''; } catch (e) { h = ''; } out[k].hits.push(h); if (h) count++; });
      perRound.push(count);
      // 이번 회차를 누적 정보에 더합니다 (다음 회차의 "과거")
      var N = d.numbers;
      N.forEach(function (n) { past.lastSeen[n] = d.round; past.recent100[n] = (past.recent100[n] || 0) + 1; });
      var old = draws[i - 100]; if (old) old.numbers.forEach(function (n) { past.recent100[n]--; });
      pairs(N, function (a, b) { var k = a + ',' + b; past.pairs[k] = (past.pairs[k] || 0) + 1; return ''; });
      combos3(N).forEach(function (k) { past.trios[k] = d.round; });
      combos4(N).forEach(function (k) { past.quads[k] = d.round; });
      var z = zoneKey(N); past.shapes[z] = (past.shapes[z] || 0) + 1;
    });
    out.forEach(function (r) {
      var total = 0, b = { hit: 0, n: 0 }, a = { hit: 0, n: 0 }, streak = 0;
      r.hits.forEach(function (h, i) { var bucket = draws[i].round <= r.since ? b : a; bucket.n++; if (h) { bucket.hit++; total++; } });
      for (var i = r.hits.length - 1; i >= 0 && r.hits[i]; i--) streak++;
      r.total = total; r.rate = total / draws.length; r.before = b; r.after = a;
      r.recent10 = r.hits.slice(-10).filter(Boolean).length; r.streak = streak;
    });
    return { rounds: draws.map(function (d) { return d.round; }), rules: out, perRound: perRound };
  }

  /* 한 회차의 짧은 해설: 몇 개 맞았는지, 평소 평균과 비교, 가장 드문 적중 2개 */
  function summary(result, idx) {
    var hits = result.rules.filter(function (r) { return r.hits[idx]; }).sort(function (a, b) { return a.rate - b.rate; });
    var counts = result.perRound.slice(0, idx), avg = counts.length ? counts.reduce(function (x, y) { return x + y; }, 0) / counts.length : 0;
    var rare = hits.filter(function (r) { return r.rate < 0.1; }).slice(0, 2);
    var text = result.rules.length + '개 규칙 중 ' + hits.length + '개에 맞았어요(평소 평균 ' + avg.toFixed(1) + '개). ';
    text += rare.length ? '가장 드문 건 ' + rare.map(function (r) { return '"' + r.name + '"(역대 ' + (r.rate * 100).toFixed(1) + '%)'; }).join(', ') + '이에요.' : '이번엔 드문 억지가 없었어요.';
    return { text: text, hits: hits, avg: avg };
  }

  var API = { RULES: RULES, evaluate: evaluate, summary: summary };
  if (typeof module === 'object' && module.exports) module.exports = API;
  else root.LottoRules = API;
})(this);
