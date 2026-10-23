// 동행복권에서 역대 로또 당첨번호를 받아 data/lotto.json에 추가합니다.
// 파일에 있는 마지막 회차 다음부터 최신 회차까지 한 번에 받습니다.
// 실행: node scripts/fetch-lotto.mjs

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const DATA_FILE = resolve(dirname(fileURLToPath(import.meta.url)), '../data/lotto.json');
// 회차 범위를 주면 그 범위의 당첨 결과를 최신 회차부터 돌려줍니다.
// 아직 추첨하지 않은 회차는 결과에 빠집니다.
const API = 'https://www.dhlottery.co.kr/lt645/selectPstLt645Info.do';
const RETRIES = 3;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function loadDraws() {
  try {
    return JSON.parse(await readFile(DATA_FILE, 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

async function fetchRange(from, to) {
  const url = `${API}?srchStrLtEpsd=${from}&srchEndLtEpsd=${to}`;
  let lastErr;
  for (let attempt = 1; attempt <= RETRIES; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; lotto-data-bot)',
          Accept: 'application/json',
        },
      });
      const text = await res.text();
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
      try {
        return JSON.parse(text).data.list;
      } catch {
        // 주소가 바뀌거나 접속이 막히면 JSON 대신 HTML 페이지가 옵니다.
        throw new Error(`예상과 다른 응답 (${res.url}): ${text.slice(0, 200).replace(/\s+/g, ' ')}`);
      }
    } catch (err) {
      lastErr = err;
      if (attempt < RETRIES) await sleep(3000 * attempt);
    }
  }
  throw new Error(`${from}~${to}회 조회 실패: ${lastErr.message}`);
}

function toDraw(d) {
  const draw = {
    round: d.ltEpsd,
    date: `${d.ltRflYmd.slice(0, 4)}-${d.ltRflYmd.slice(4, 6)}-${d.ltRflYmd.slice(6, 8)}`,
    numbers: [d.tm1WnNo, d.tm2WnNo, d.tm3WnNo, d.tm4WnNo, d.tm5WnNo, d.tm6WnNo],
    bonus: d.bnsWnNo,
    firstPrize: d.rnk1WnAmt,
    firstWinners: d.rnk1WnNope,
    totalSales: d.wholEpsdSumNtslAmt,
  };
  const balls = [...draw.numbers, draw.bonus];
  if (!balls.every((n) => Number.isInteger(n) && n >= 1 && n <= 45) || new Set(balls).size !== 7) {
    throw new Error(`${draw.round}회 번호가 올바르지 않습니다: ${JSON.stringify(d)}`);
  }
  return draw;
}

// 회차 하나를 한 줄로 써서, 매주 변경 내역이 한 줄 추가로 보이게 합니다.
function serialize(draws) {
  return '[\n' + draws.map((d) => '  ' + JSON.stringify(d)).join(',\n') + '\n]\n';
}

const draws = await loadDraws();
const start = draws.length ? draws[draws.length - 1].round + 1 : 1;
const added = (await fetchRange(start, start + 10000)).map(toDraw).sort((a, b) => a.round - b.round);

added.forEach((d, i) => {
  if (d.round !== start + i) throw new Error(`회차가 빠져 있습니다: ${start + i}회 자리에 ${d.round}회`);
});
if (start === 1 && added.length === 0) {
  throw new Error('당첨번호를 하나도 받지 못했습니다. API 응답 형식이 바뀌었는지 확인하세요.');
}

if (added.length === 0) {
  console.log(`새 회차 없음 (최신 ${start - 1}회)`);
} else {
  await mkdir(dirname(DATA_FILE), { recursive: true });
  await writeFile(DATA_FILE, serialize([...draws, ...added]));
  console.log(`${added[0].round}~${added[added.length - 1].round}회 추가 (${added.length}개)`);
}
