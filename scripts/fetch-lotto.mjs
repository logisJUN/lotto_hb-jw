// 동행복권에서 역대 로또 당첨번호를 받아 data/lotto.json에 추가합니다.
// 파일에 있는 마지막 회차 다음부터, 아직 추첨하지 않은 회차가 나올 때까지 받습니다.
// 실행: node scripts/fetch-lotto.mjs

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const DATA_FILE = resolve(dirname(fileURLToPath(import.meta.url)), '../data/lotto.json');
const API = 'https://www.dhlottery.co.kr/common.do?method=getLottoNumber&drwNo=';
const DELAY_MS = 150;
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

// 회차 하나를 받습니다. 아직 추첨 전이면 null을 돌려줍니다.
async function fetchDraw(round) {
  let lastErr;
  for (let attempt = 1; attempt <= RETRIES; attempt++) {
    try {
      const res = await fetch(API + round, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; lotto-data-bot)',
          Accept: 'application/json',
        },
      });
      const text = await res.text();
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);

      let d;
      try {
        d = JSON.parse(text);
      } catch {
        // 점검 중이거나 접속이 막히면 JSON 대신 HTML 페이지가 옵니다.
        throw new Error(`JSON이 아닌 응답: ${text.slice(0, 200).replace(/\s+/g, ' ')}`);
      }

      if (d.returnValue !== 'success') return null;
      return {
        round: d.drwNo,
        date: d.drwNoDate,
        numbers: [d.drwtNo1, d.drwtNo2, d.drwtNo3, d.drwtNo4, d.drwtNo5, d.drwtNo6],
        bonus: d.bnusNo,
        firstPrize: d.firstWinamnt,
        firstWinners: d.firstPrzwnerCo,
        totalSales: d.totSellamnt,
      };
    } catch (err) {
      lastErr = err;
      if (attempt < RETRIES) await sleep(2000 * attempt);
    }
  }
  throw new Error(`${round}회 조회 실패: ${lastErr.message}`);
}

// 회차 하나를 한 줄로 써서, 매주 변경 내역이 한 줄 추가로 보이게 합니다.
function serialize(draws) {
  return '[\n' + draws.map((d) => '  ' + JSON.stringify(d)).join(',\n') + '\n]\n';
}

const draws = await loadDraws();
const start = draws.length ? draws[draws.length - 1].round + 1 : 1;
const added = [];

for (let round = start; ; round++) {
  const draw = await fetchDraw(round);
  if (!draw) break;
  added.push(draw);
  if (added.length % 100 === 0) console.log(`${round}회까지 받음`);
  await sleep(DELAY_MS);
}

if (start === 1 && added.length === 0) {
  throw new Error('1회차도 받지 못했습니다. API 응답 형식이 바뀌었는지 확인하세요.');
}

if (added.length === 0) {
  console.log(`새 회차 없음 (최신 ${start - 1}회)`);
} else {
  await mkdir(dirname(DATA_FILE), { recursive: true });
  await writeFile(DATA_FILE, serialize([...draws, ...added]));
  console.log(`${added[0].round}~${added[added.length - 1].round}회 추가 (${added.length}개)`);
}
