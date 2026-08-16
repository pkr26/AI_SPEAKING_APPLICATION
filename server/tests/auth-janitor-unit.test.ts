import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  runExclusiveBatchedDelete: vi.fn(),
}));

vi.mock('../src/janitor', () => ({
  JANITOR_BATCH_SIZE: 500,
  runExclusiveBatchedDelete: mocks.runExclusiveBatchedDelete,
}));

describe('password-reset janitor contract', () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.runExclusiveBatchedDelete.mockReset();
  });

  it('uses the stable distributed lock namespace and bounded delete', async () => {
    mocks.runExclusiveBatchedDelete.mockResolvedValueOnce(7);
    const { cleanupPasswordResetTokens } = await import('../src/auth');

    await expect(cleanupPasswordResetTokens()).resolves.toBe(7);
    expect(mocks.runExclusiveBatchedDelete).toHaveBeenCalledOnce();
    expect(mocks.runExclusiveBatchedDelete).toHaveBeenCalledWith(
      'janitor:password-reset-tokens',
      expect.stringMatching(/DELETE FROM password_reset_tokens[\s\S]*expires_at <= now\(\)[\s\S]*LIMIT 500/),
    );
  });
});
