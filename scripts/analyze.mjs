// 패턴 분석 기록을 analysis/ 폴더에 씁니다. 사이트와 같은 규칙(js/rules.js)을 씁니다.
// - analysis/<회차>.md : 그 회차의 기록. 한 번 쓰면 다시 덮어쓰지 않습니다(그 주의 기록을 그대로 남김).
// - analysis/README.md : 회차별 기록 목록과 규칙 성적표. 실행할 때마다 새로 씁니다.
// 실행: node scripts/analyze.mjs

import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(ROOT, 'analysis');
const require = createRequire(import.meta.url);
const { evaluate, summary } = require(resolve(ROOT, 'js/rules.js'));

const exists = (p) => access(p).then(() => true, () => false);
const pct = (x) => (x * 100).toFixed(1) + '%';
const after = (r) => (r.after.n ? `${r.after.hit}/${r.after.n}회 (${pct(r.after.hit / r.after.n)})` : '아직 없음');
const cell = (s) => String(s).replace(/\|/g, '\\|');

const draws = JSON.parse(await readFile(resolve(ROOT, 'data/lotto.json'), 'utf8'));
const res = evaluate(draws);
const FIRST = Math.min(...res.rules.map((r) => r.since));   // 기록은 첫 규칙을 만든 회차부터 남깁니다
await mkdir(OUT, { recursive: true });

function roundPage(idx) {
  const d = draws[idx], s = summary(res, idx);
  const missed = res.rules.filter((r) => !r.hits[idx]);
  const born = res.rules.filter((r) => r.since === d.round);
  return [
    `# ${d.round}회 패턴 분석 (${d.date})`,
    '',
    `당첨번호: **${d.numbers.join(' · ')}** + 보너스 **${d.bonus}**`,
    '',
    '> 역대 당첨번호에서 찾은 패턴 규칙들로 이 회차를 풀이한 기록입니다. 예측이 아니라 기록용이에요.',
    '',
    '## 한 줄 해설',
    '',
    s.text,
    '',
    `## 맞은 규칙 ${s.hits.length}개 (드문 순)`,
    '',
    '| 규칙 | 이번 근거 | 역대 적중률 | 발견 후 성적 |',
    '| --- | --- | --- | --- |',
    ...s.hits.map((r) => `| ${cell(r.name)} | ${cell(r.hits[idx])} | ${pct(r.rate)} | ${after(r)} |`),
    '',
    `## 안 맞은 규칙 ${missed.length}개`,
    '',
    missed.map((r) => r.name).join(' · ') || '없음',
    '',
    ...(born.length ? [
      `## 이번 회차를 보고 새로 만든 규칙 ${born.length}개`,
      '',
      `이 규칙들은 ${d.round}회 번호를 본 뒤에 만들었기 때문에 ${d.round}회까지의 결과는 규칙을 찾을 때 이미 본 기록이에요. ${d.round + 1}회부터 "발견 후 성적"으로 따로 셉니다.`,
      '',
      born.map((r) => r.name).join(' · '),
      '',
    ] : []),
    '---',
    `기록 시점: ${d.round}회까지의 데이터 · 규칙 ${res.rules.length}개 · 규칙 설명은 [README](README.md#규칙-성적표)에 있어요.`,
    '',
  ].join('\n');
}

// 1) 회차별 기록 (없는 것만 새로 씀)
const written = [];
for (let i = 0; i < draws.length; i++) {
  if (draws[i].round < FIRST) continue;
  const file = resolve(OUT, `${draws[i].round}.md`);
  if (await exists(file)) continue;
  await writeFile(file, roundPage(i));
  written.push(draws[i].round);
}

// 2) 목록과 성적표
const last = draws.length - 1, s = summary(res, last);
const logged = [];
for (let i = last; i >= 0 && draws[i].round >= FIRST; i--) logged.push(i);
const board = res.rules.slice().sort((a, b) => (b.after.n ? b.after.hit / b.after.n : -1) - (a.after.n ? a.after.hit / a.after.n : -1) || a.rate - b.rate);
const readme = [
  '# 패턴 분석 기록',
  '',
  '역대 당첨번호에서 찾은 패턴 규칙들을 모아, 매주 새 회차에 적용한 기록입니다. 예측이 아니라 기록용이에요.',
  '',
  '- 매주 당첨번호를 수집할 때 GitHub Actions가 자동으로 이 폴더를 갱신합니다. 사이트의 **통계 → 패턴 분석 기록** 카드와 같은 규칙(`js/rules.js`)을 씁니다.',
  '- **역대 적중률**: 1회부터 지금까지 그 규칙이 맞은 비율',
  '- **발견 후 성적**: 규칙을 만든 회차 *다음*부터의 성적. 우연히 보인 패턴이라면 발견 후 성적은 역대 적중률 근처로 돌아와요.',
  '',
  `## 최신: ${draws[last].round}회 (${draws[last].date})`,
  '',
  `${draws[last].numbers.join(' · ')} + 보너스 ${draws[last].bonus} — ${s.text} → [자세히](${draws[last].round}.md)`,
  '',
  '## 회차별 기록',
  '',
  '| 회차 | 날짜 | 당첨번호 | 맞은 규칙 |',
  '| --- | --- | --- | --- |',
  ...logged.map((i) => `| [${draws[i].round}회](${draws[i].round}.md) | ${draws[i].date} | ${draws[i].numbers.join(' · ')} + ${draws[i].bonus} | ${res.perRound[i]} / ${res.rules.length} |`),
  '',
  '## 규칙 성적표',
  '',
  '발견 후 성적이 좋은 순서(같으면 역대에 드문 순서)입니다.',
  '',
  '| 규칙 | 설명 | 만든 회차 | 역대 적중률 | 발견 후 성적 | 최근 10회 |',
  '| --- | --- | --- | --- | --- | --- |',
  ...board.map((r) => `| ${cell(r.name)} | ${cell(r.desc)} | ${r.since}회 | ${pct(r.rate)} | ${after(r)} | ${r.recent10}/10 |`),
  '',
].join('\n');
await writeFile(resolve(OUT, 'README.md'), readme);

console.log(`패턴 분석: 규칙 ${res.rules.length}개, 새 기록 ${written.length ? written.join(', ') + '회' : '없음'}, 최신 ${draws[last].round}회 ${res.perRound[last]}개 적중`);
