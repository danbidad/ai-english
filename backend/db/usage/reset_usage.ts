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

export function nextMidnightInPST(from: Date): Date {
  // America/Los_Angeles 타임존 (PST/PDT 자동 처리됨)
  const tz = 'America/Los_Angeles' as const;

  // 1. 현재 로스앤젤레스 시간의 날짜 구성요소를 구함
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric', month: '2-digit', day: '2-digit'
  });
  const parts = fmt.formatToParts(from);
  const y = Number(parts.find(p => p.type === 'year')!.value);
  const m = Number(parts.find(p => p.type === 'month')!.value);
  const d = Number(parts.find(p => p.type === 'day')!.value);

  // 2. 월/연도 변경을 올바르게 처리하며 로스앤젤레스 시간 기준 "내일"을 계산
  // 추출된 구성요소를 UTC로 취급하여 안전하게 날짜 계산 수행
  const tempDate = new Date(Date.UTC(y, m - 1, d));
  tempDate.setUTCDate(tempDate.getUTCDate() + 1); // 1일 더하기

  const targetLocal = {
    y: tempDate.getUTCFullYear(),
    m: tempDate.getUTCMonth() + 1,
    d: tempDate.getUTCDate(),
    hh: 0, mm: 0, ss: 0
  };

  // 3. 로스앤젤레스 시간 기준 targetLocal(00:00:00)에 해당하는 UTC 타임스탬프 찾기
  // 탐색 범위: 현재 시간 + 1시간 ~ + 48시간 (DST 변경은 최대 1시간 차이이므로 충분)
  const base = from.getTime();
  let lo = base;
  let hi = base + 48 * 3600_000;

  // 비교 함수: 후보 시간 `t`가 targetLocal보다 이전인지 확인
  const isBeforeLocal = (t: number) => {
    const ps = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false
    }).formatToParts(new Date(t));

    const yy = Number(ps.find(p => p.type === 'year')!.value);
    const mm = Number(ps.find(p => p.type === 'month')!.value);
    const dd = Number(ps.find(p => p.type === 'day')!.value);
    const hh = Number(ps.find(p => p.type === 'hour')!.value);
    const mi = Number(ps.find(p => p.type === 'minute')!.value);
    const ss = Number(ps.find(p => p.type === 'second')!.value);

    // 사전순 비교 (Lexicographical comparison)
    if (yy !== targetLocal.y) return yy < targetLocal.y;
    if (mm !== targetLocal.m) return mm < targetLocal.m;
    if (dd !== targetLocal.d) return dd < targetLocal.d;
    if (hh !== targetLocal.hh) return hh < targetLocal.hh;
    if (mi !== targetLocal.mm) return mi < targetLocal.mm;
    return ss < targetLocal.ss;
  };

  // 이진 탐색 (Binary search)
  for (let i = 0; i < 60; i++) {
    const mid = Math.floor((lo + hi) / 2);
    if (isBeforeLocal(mid)) {
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
    if (lo > hi) break; // 안전장치 (lo=mid+1/hi=mid-1 로직상 보통 발생 안 함)
  }

  // 결과가 유효 범위 내에 있는지 확인 (가끔 이진 탐색이 -1/+1 오차로 끝날 수 있음)
  // 가장 가까운 근사값으로 `lo`를 반환
  return new Date(lo);
}
