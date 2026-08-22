import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import test from 'node:test';

import { MutationChildSignaledError, runMutationProcess } from './mutation-process.mjs';
import { runMutationAll } from './run-mutation-all.mjs';

test('mutation child signals are distinct unsafe failures with stable shell-style exit codes', async () => {
  for (const [signal, exitCode] of [
    ['SIGINT', 130],
    ['SIGTERM', 143],
    ['SIGKILL', 128],
  ]) {
    const child = Object.assign(new EventEmitter(), { pid: 4321 });
    const processResult = runMutationProcess('node', [], {}, () => child);
    child.emit('exit', null, signal);
    await assert.rejects(processResult, (error) => {
      assert.ok(error instanceof MutationChildSignaledError);
      assert.equal(error.signal, signal);
      assert.equal(error.exitCode, exitCode);
      assert.equal(error.pid, 4321);
      return true;
    });
  }
});

test('mutation process reports ordinary exits and spawn failures without signal classification', async () => {
  const child = Object.assign(new EventEmitter(), { pid: 123 });
  const exited = runMutationProcess('node', [], {}, () => child);
  child.emit('exit', 7, null);
  await assert.doesNotReject(async () => assert.equal(await exited, 7));

  const failure = new Error('spawn failed');
  await assert.rejects(
    runMutationProcess('node', [], {}, () => {
      throw failure;
    }),
    (error) => error === failure,
  );
});

test('the top-level backend runner always executes code and catalog before aggregating failure', async () => {
  const calls = [];
  const result = await runMutationAll({
    serverDir: '/fixture/server',
    environment: { MARKER: 'value' },
    runCampaign: async ({ campaign, serverDir, environment }) => {
      calls.push({ campaign, serverDir, marker: environment.MARKER });
      if (campaign === 'mutation:code') return 9;
      return 0;
    },
  });
  assert.deepEqual(calls, [
    { campaign: 'mutation:code', serverDir: '/fixture/server', marker: 'value' },
    { campaign: 'mutation:catalog', serverDir: '/fixture/server', marker: 'value' },
  ]);
  assert.equal(result.exitCode, 1);
  assert.deepEqual(
    result.results.map(({ campaign, exitCode }) => ({ campaign, exitCode })),
    [
      { campaign: 'mutation:code', exitCode: 9 },
      { campaign: 'mutation:catalog', exitCode: 0 },
    ],
  );
});

test('the top-level runner still starts catalog when the code command throws', async () => {
  const calls = [];
  const failure = new Error('code command crashed');
  const result = await runMutationAll({
    runCampaign: async ({ campaign }) => {
      calls.push(campaign);
      if (campaign === 'mutation:code') throw failure;
      return 4;
    },
  });
  assert.deepEqual(calls, ['mutation:code', 'mutation:catalog']);
  assert.equal(result.exitCode, 1);
  assert.equal(result.results[0].error, failure);
  assert.equal(result.results[1].exitCode, 4);
});
