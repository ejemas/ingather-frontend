import { clearDashboardCache, rememberDashboard } from './dashboardCache';

beforeEach(() => {
  clearDashboardCache();
  localStorage.setItem('token', 'account-a');
  jest.useRealTimers();
});

test('switching pages reuses a recent answer instead of asking the server again', async () => {
  const load = jest.fn().mockResolvedValue({ stats: 1 });
  await rememberDashboard(['d1'], load);
  await rememberDashboard(['d1'], load);
  expect(load).toHaveBeenCalledTimes(1);
});

test('two pages asking at the same moment share one request', async () => {
  let finish;
  const load = jest.fn(() => new Promise((resolve) => { finish = resolve; }));
  const a = rememberDashboard(['d1'], load);
  const b = rememberDashboard(['d1'], load);
  finish({ ok: true });
  expect(await a).toEqual({ ok: true });
  expect(await b).toEqual({ ok: true });
  expect(load).toHaveBeenCalledTimes(1);
});

test('the answer expires after 30 seconds', async () => {
  jest.useFakeTimers({ now: 1_000_000 });
  const load = jest.fn().mockResolvedValue({});
  await rememberDashboard(['d1'], load);
  jest.setSystemTime(1_000_000 + 31_000);
  await rememberDashboard(['d1'], load);
  expect(load).toHaveBeenCalledTimes(2);
});

test('fresh requests always go to the server, and clearing forgets everything', async () => {
  const load = jest.fn().mockResolvedValue({});
  await rememberDashboard(['d1'], load);
  await rememberDashboard(['d1'], load, { fresh: true });
  expect(load).toHaveBeenCalledTimes(2);
  clearDashboardCache();
  await rememberDashboard(['d1'], load);
  expect(load).toHaveBeenCalledTimes(3);
});

test('another account never sees the first account\'s summary', async () => {
  const loadA = jest.fn().mockResolvedValue({ who: 'a' });
  const loadB = jest.fn().mockResolvedValue({ who: 'b' });
  await rememberDashboard(['d1'], loadA);
  localStorage.setItem('token', 'account-b');
  expect(await rememberDashboard(['d1'], loadB)).toEqual({ who: 'b' });
});

test('a failed request is not remembered', async () => {
  const load = jest.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ ok: true });
  await expect(rememberDashboard(['d1'], load)).rejects.toThrow('offline');
  expect(await rememberDashboard(['d1'], load)).toEqual({ ok: true });
});

test('different dates are remembered separately', async () => {
  const load = jest.fn().mockResolvedValue({});
  await rememberDashboard(['2026-11-01'], load);
  await rememberDashboard(['2026-11-02'], load);
  expect(load).toHaveBeenCalledTimes(2);
});
