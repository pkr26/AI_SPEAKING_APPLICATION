import { spawn } from 'node:child_process';

export class MutationChildSignaledError extends Error {
  constructor({ signal, pid }) {
    super(`Mutation child${pid ? ` pid ${pid}` : ''} terminated by signal ${signal}`);
    this.name = 'MutationChildSignaledError';
    this.signal = signal;
    this.pid = pid;
    this.exitCode = signal === 'SIGINT' ? 130 : signal === 'SIGTERM' ? 143 : 128;
  }
}

export function runMutationProcess(command, args, options, spawnProcess = spawn) {
  return new Promise((resolve, reject) => {
    let child;
    try {
      child = spawnProcess(command, args, { ...options, stdio: 'inherit' });
    } catch (error) {
      reject(error);
      return;
    }
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (signal) reject(new MutationChildSignaledError({ signal, pid: child.pid }));
      else resolve(code ?? 1);
    });
  });
}

export function mutationTerminationIsUnsafe(value) {
  return value instanceof MutationChildSignaledError || value === 130 || value === 143;
}
