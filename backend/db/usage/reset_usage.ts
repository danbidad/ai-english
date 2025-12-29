import { UsageDB } from "./usagedb.js";

export function SetScheduleResetUsageDB() {
  // 다음 미국 태평양 자정까지 대기 후 매일 24시간마다 실행
  const scheduleNext = () => {
    const now = new Date();
    const next = nextMidnightInPST(now);
    const ms = next.getTime() - now.getTime();
    setTimeout(async () => {
      try { await UsageDB.resetAndArchiveForPSTMidnight(); } catch (e) { console.error(e); }
      // 이후에는 24시간 간격으로 실행하되, 드리프트 방지 위해 다시 계산
      scheduleNext();
    }, ms);
  };
  scheduleNext();
}

function nextMidnightInPST(from: Date): Date {
  // America/Los_Angeles에서의 자정 시간을 Date로 역계산
  const tz = 'America/Los_Angeles' as const;
  // 현재 PST 날짜를 구함
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(from);
  const y = Number(parts.find(p => p.type === 'year')!.value);
  const m = Number(parts.find(p => p.type === 'month')!.value);
  const d = Number(parts.find(p => p.type === 'day')!.value);
  // PST 기준 다음날 00:00의 UTC 시각을 구하기 위해 PST 날짜 컴포넌트로 현지 시간을 만들고, timeZone 변환 오프셋을 추정
  // 방법: 해당 로컬 시간의 UTC 타임스탬프를 구하기 위해 같은 구성요소를 가진 문자열을 만들어 Date.parse하고, 그 시각의 오프셋을 timeZone으로 다시 역산.
  // 간단한 접근: 바이너리 서치로 UTC 타임스탬프를 찾는다 (짧은 범위라 허용).
  const targetLocal = { y, m, d: d + 1, hh: 0, mm: 0, ss: 0 };
  // 월말 넘김 처리
  const base = new Date(Date.UTC(y, m - 1, d, 12)); // 대략 당일 정오 UTC를 기준으로 시작
  // 탐색 범위: ±48시간
  let lo = base.getTime() - 48 * 3600_000;
  let hi = base.getTime() + 48 * 3600_000;
  const isBeforeLocal = (t: number) => {
    const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    const ps = fmt.formatToParts(new Date(t));
    const yy = Number(ps.find(p => p.type === 'year')!.value);
    const mm = Number(ps.find(p => p.type === 'month')!.value);
    const dd = Number(ps.find(p => p.type === 'day')!.value);
    const hh = Number(ps.find(p => p.type === 'hour')!.value);
    const mi = Number(ps.find(p => p.type === 'minute')!.value);
    const ss = Number(ps.find(p => p.type === 'second')!.value);
    const cmp = (yy - targetLocal.y) || (mm - targetLocal.m) || (dd - targetLocal.d) || (hh - targetLocal.hh) || (mi - targetLocal.mm) || (ss - targetLocal.ss);
    return cmp < 0;
  };
  // 이진 탐색으로 해당 현지 시각에 가장 가까운 UTC 타임스탬프를 찾음
  for (let i = 0; i < 60; i++) {
    const mid = Math.floor((lo + hi) / 2);
    if (isBeforeLocal(mid)) lo = mid + 1; else hi = mid - 1;
    if (Math.abs(hi - lo) <= 1000) break;
  }
  return new Date(lo);
}
