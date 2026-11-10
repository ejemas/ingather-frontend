import API from './axios';
import { rememberDashboard } from './dashboardCache';

test('saving a change clears the remembered summary; plain reads do not', async () => {
  localStorage.setItem('token', 'acct');
  const load = jest.fn().mockResolvedValue({});
  const ok = (config) => Promise.resolve({ data: {}, status: 200, statusText: 'OK', headers: {}, config });
  API.defaults.adapter = ok;

  await rememberDashboard(['x'], load);
  await API.get('/programs');
  await rememberDashboard(['x'], load);
  expect(load).toHaveBeenCalledTimes(1);

  await API.put('/programs/12/stop');
  await rememberDashboard(['x'], load);
  expect(load).toHaveBeenCalledTimes(2);

  await API.delete('/pre-events/3');
  await rememberDashboard(['x'], load);
  expect(load).toHaveBeenCalledTimes(3);
});

test('an ended sign-in clears it too', async () => {
  const load = jest.fn().mockResolvedValue({});
  await rememberDashboard(['y'], load);
  API.defaults.adapter = (config) => Promise.reject(Object.assign(new Error('401'), { config, response: { status: 401, data: {}, config } }));
  await expect(API.get('/programs')).rejects.toBeTruthy();
  await rememberDashboard(['y'], load);
  expect(load).toHaveBeenCalledTimes(2);
});
