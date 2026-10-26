/* 로또랩 - 사주 번호
   양력 생년월일(과 태어난 시)로 사주팔자(년주·월주·일주·시주)를 계산하고, 오행으로 이번 주 번호 6개를 정합니다.
   - 년·월의 경계는 절기(입춘·경칩 …)입니다. 절기는 태양의 위치(황경)를 계산해서 찾습니다.
   - 일주는 날짜의 율리우스일(JDN)로, 시주는 일간과 태어난 시진으로 구합니다.
   - 번호는 하도(河圖) 수리로 오행에 연결합니다: 수 1·6, 화 2·7, 목 3·8, 금 4·9, 토 5·0 (번호의 끝자리)
   - 같은 생년월일·같은 시, 같은 추첨 회차면 항상 같은 번호가 나옵니다(회차를 시드로 씀).
   재미로 보는 전통 풀이이며, 당첨 확률과는 관계없습니다. 브라우저(window.LottoSaju)와 Node(require) 모두에서 씁니다. */
(function (root) {
  'use strict';

  var STEMS = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'];
  var STEMS_H = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
  var BRANCHES = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해'];
  var BRANCHES_H = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  var ANIMALS = ['쥐', '소', '호랑이', '토끼', '용', '뱀', '말', '양', '원숭이', '닭', '개', '돼지'];
  // 오행: 0 목, 1 화, 2 토, 3 금, 4 수
  var EL = ['목', '화', '토', '금', '수'];
  var EL_H = ['木', '火', '土', '金', '水'];
  var EL_DESC = ['나무처럼 뻗어 나가는 기운', '불처럼 밝게 드러나는 기운', '흙처럼 받쳐 주는 기운', '쇠처럼 단단히 맺는 기운', '물처럼 스며드는 기운'];
  var STEM_EL = [0, 0, 1, 1, 2, 2, 3, 3, 4, 4];
  var BRANCH_EL = [4, 2, 0, 0, 2, 1, 1, 2, 3, 3, 2, 4];
  var DAY_MASTER = ['큰 나무', '풀과 꽃', '태양', '촛불', '큰 산', '논밭의 흙', '바위와 쇠', '보석', '바다와 큰 강', '비와 이슬'];
  // 하도 수리: 끝자리 → 오행
  var DIGIT_EL = { 1: 4, 6: 4, 2: 1, 7: 1, 3: 0, 8: 0, 4: 3, 9: 3, 5: 2, 0: 2 };
  // 시진 (한국 표준시 기준, 30분 늦춘 관례)
  var HOURS = ['자시 23:30~01:29', '축시 01:30~03:29', '인시 03:30~05:29', '묘시 05:30~07:29', '진시 07:30~09:29', '사시 09:30~11:29',
    '오시 11:30~13:29', '미시 13:30~15:29', '신시 15:30~17:29', '유시 17:30~19:29', '술시 19:30~21:29', '해시 21:30~23:29'];

  function mod(a, n) { return ((a % n) + n) % n; }
  // 그레고리력 날짜 → 율리우스일 수(JDN, 정오 기준 정수)
  function jdn(y, m, d) {
    var a = Math.floor((14 - m) / 12), yy = y + 4800 - a, mm = m + 12 * a - 3;
    return d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
  }
  // 태양의 겉보기 황경(도). 오차는 0.01° 안팎(절기 시각으로 약 15분)입니다.
  function sunLongitude(jd) {
    var T = (jd - 2451545.0) / 36525, r = Math.PI / 180;
    var L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
    var M = (357.52911 + 35999.05029 * T - 0.0001537 * T * T) * r;
    var C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(M) + (0.019993 - 0.000101 * T) * Math.sin(2 * M) + 0.000289 * Math.sin(3 * M);
    var omega = (125.04 - 1934.136 * T) * r;
    return mod(L0 + C - 0.00569 - 0.00478 * Math.sin(omega), 360);
  }
  function pillar(idx60) { idx60 = mod(idx60, 60); return { idx: idx60, stem: idx60 % 10, branch: idx60 % 12 }; }
  function pillarOf(stem, branch) { for (var k = 0; k < 60; k++) if (k % 10 === stem && k % 12 === branch) return pillar(k); return null; }
  function name(p) { return STEMS[p.stem] + BRANCHES[p.branch]; }
  function hanja(p) { return STEMS_H[p.stem] + BRANCHES_H[p.branch]; }
  // 날짜의 일주 (1990-01-01 = 병인일)
  function dayPillar(y, m, d) { return pillar(jdn(y, m, d) - 11); }

  /* 사주팔자: y·m·d는 양력, hour는 시진 번호(0 자시 … 11 해시) 또는 null(모름)
     월은 절기로 나눕니다: 입춘(황경 315°)부터 인월(寅月), 30°마다 다음 달 */
  function pillars(y, m, d, hour) {
    // 태어난 시각(모르면 정오)을 한국 시각 → UTC로 바꿔 그 순간의 태양 황경을 구합니다
    var kstHour = hour == null ? 12 : hour === 0 ? 0.5 : hour * 2 + 0.5;   // 시진의 한가운데 (자시는 그날 0:30, 축시 2:30 …)
    var jd = jdn(y, m, d) - 0.5 + (kstHour - 9) / 24;
    var lon = sunLongitude(jd);
    var monthIdx = Math.floor(mod(lon - 315, 360) / 30);              // 0 인월 … 10 자월, 11 축월
    var sajuYear = (m <= 2 && monthIdx >= 10) ? y - 1 : y;            // 입춘 전이면 전년도
    var year = pillar(sajuYear - 4);                                  // 1984년 = 갑자년
    var month = pillarOf(mod((year.stem % 5) * 2 + 2 + monthIdx, 10), mod(monthIdx + 2, 12));
    var day = dayPillar(y, m, d);
    var hourP = hour == null ? null : pillarOf(mod((day.stem % 5) * 2 + hour, 10), hour);
    return { year: year, month: month, day: day, hour: hourP, sajuYear: sajuYear, sunLon: lon, nearTerm: Math.abs(mod(lon - 315 + 15, 30) - 15) < 1 };
  }

  function elementCounts(p) {
    var c = [0, 0, 0, 0, 0];
    [p.year, p.month, p.day, p.hour].forEach(function (x) { if (!x) return; c[STEM_EL[x.stem]]++; c[BRANCH_EL[x.branch]]++; });
    return c;
  }

  // 문자열 → 32비트 해시, 해시 → 0~1 난수열 (같은 입력이면 항상 같은 순서)
  function hash(str) { var h = 2166136261; for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function numEl(n) { return DIGIT_EL[n % 10]; }

  /* 이번 주 사주 번호
     1) 사주 8글자(시를 모르면 6글자)의 오행 개수를 셉니다.
     2) 가장 부족한 오행을 "채울 기운"으로 정합니다. 여럿이면 일간(나)을 생(生)해 주는 오행 → 나와 같은 오행 → 목화토금수 순.
     3) 번호마다 가중치: 채울 기운 4, 일간 오행 2, 이번 추첨일 일진의 오행 2, 넘치는 오행 0.5, 그 밖 1
     4) 강력한 번호: 채울 기운에 해당하는 번호(끝자리) 중 하나를 시드 난수로 먼저 고릅니다.
     5) 나머지 5개는 가중치에 따라 시드 난수로 겹치지 않게 뽑습니다. 시드 = 생년월일 + 시 + 추첨 회차 */
  function weeklyNumbers(birth, hour, p, round, drawDay) {
    var counts = elementCounts(p), me = STEM_EL[p.day.stem];
    var minC = Math.min.apply(null, counts), maxC = Math.max.apply(null, counts);
    var parent = mod(me - 1, 5);                                       // 나를 생해 주는 오행 (수생목, 목생화 …)
    var lacking = [0, 1, 2, 3, 4].filter(function (e) { return counts[e] === minC; });
    var need = lacking.indexOf(parent) >= 0 ? parent : lacking.indexOf(me) >= 0 ? me : lacking[0];
    var weekEl = STEM_EL[drawDay.stem];
    var weight = function (n) {
      var e = numEl(n), w = 1;
      if (e === need) w = 4; else if (e === me || e === weekEl) w = 2; else if (counts[e] === maxC && maxC >= 3) w = 0.5;
      if (e === me && e === weekEl && e !== need) w = 3;
      return w;
    };
    var rand = rng(hash(birth + '|' + (hour == null ? '-' : hour) + '|' + round));
    var pool = []; for (var n = 1; n <= 45; n++) pool.push(n);
    var needNums = pool.filter(function (x) { return numEl(x) === need; });
    var power = needNums[Math.floor(rand() * needNums.length)];
    var picked = [power];
    while (picked.length < 6) {
      var cand = pool.filter(function (x) { return picked.indexOf(x) < 0; });
      var total = cand.reduce(function (s, x) { return s + weight(x); }, 0), r = rand() * total;
      for (var k = 0; k < cand.length; k++) { r -= weight(cand[k]); if (r <= 0) { picked.push(cand[k]); break; } }
      if (r > 0) picked.push(cand[cand.length - 1]);
    }
    return { nums: picked.slice().sort(function (a, b) { return a - b; }), power: power, counts: counts, me: me, need: need, weekEl: weekEl, numEl: numEl };
  }

  var API = {
    STEMS: STEMS, STEMS_H: STEMS_H, BRANCHES: BRANCHES, BRANCHES_H: BRANCHES_H, ANIMALS: ANIMALS, EL: EL, EL_H: EL_H, EL_DESC: EL_DESC,
    STEM_EL: STEM_EL, BRANCH_EL: BRANCH_EL, DAY_MASTER: DAY_MASTER, HOURS: HOURS,
    jdn: jdn, sunLongitude: sunLongitude, pillars: pillars, dayPillar: dayPillar, name: name, hanja: hanja,
    elementCounts: elementCounts, weeklyNumbers: weeklyNumbers, numEl: numEl
  };
  if (typeof module === 'object' && module.exports) module.exports = API;
  else root.LottoSaju = API;
})(this);
