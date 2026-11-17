import { renderHook, act } from '@testing-library/react-native';
import { useAsyncAction } from './useAsyncAction';
import { deferredCall } from '../testing/deferredCall';

test('returns the result of the call, with its arguments', async () => {
  const { result } = renderHook(() => useAsyncAction(async (a, b) => a + b));
  let sum;
  await act(async () => {
    sum = await result.current.run(2, 3);
  });
  expect(sum).toBe(5);
});

test('is busy while the call is in flight', async () => {
  const { call, settle } = deferredCall();
  const { result } = renderHook(() => useAsyncAction(call));
  expect(result.current.busy).toBe(false);
  let running;
  act(() => {
    running = result.current.run();
  });
  expect(result.current.busy).toBe(true);
  await act(async () => {
    settle('done');
    await running;
  });
  expect(result.current.busy).toBe(false);
});

test('ignores a second run while the first is in flight', async () => {
  const { call, settle } = deferredCall();
  const { result } = renderHook(() => useAsyncAction(call));
  let first;
  let second;
  act(() => {
    first = result.current.run();
    second = result.current.run();
  });
  await act(async () => {
    settle('done');
    await first;
  });
  expect(call).toHaveBeenCalledTimes(1);
  expect(await second).toBeUndefined();
});

test('accepts a new run once the previous one failed', async () => {
  const call = jest.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce('ok');
  const { result } = renderHook(() => useAsyncAction(call));
  await act(async () => {
    await expect(result.current.run()).rejects.toThrow('boom');
  });
  expect(result.current.busy).toBe(false);
  let second;
  await act(async () => {
    second = await result.current.run();
  });
  expect(second).toBe('ok');
});

test('does not update state after unmount', async () => {
  const { call, settle } = deferredCall();
  const errors = jest.spyOn(console, 'error').mockImplementation(() => {});
  const { result, unmount } = renderHook(() => useAsyncAction(call));
  let running;
  act(() => {
    running = result.current.run();
  });
  unmount();
  settle('late');
  expect(await running).toBe('late');
  expect(errors).not.toHaveBeenCalled();
  errors.mockRestore();
});
