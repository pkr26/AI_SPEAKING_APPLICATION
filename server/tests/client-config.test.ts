import { describe, expect, it } from 'vitest';
import request from 'supertest';

import {
  accountAdultEligibilityEnforcementReady,
  createClientConfigRouter,
  publicClientConfig,
  type AdsPolicyConfig,
} from '../src/client-config';
import express from 'express';

const enabled: AdsPolicyConfig = {
  enabled: true,
  audienceMode: 'adult-only',
  homeBannerEnabled: true,
  historyNativeEnabled: true,
};

describe('public client configuration', () => {
  it('keeps the release guard closed until per-account adult eligibility exists', () => {
    expect(accountAdultEligibilityEnforcementReady()).toBe(false);
  });

  it('does not let operator adult-only flags enable public placements', () => {
    expect(publicClientConfig(enabled)).toEqual({
      ads: {
        enabled: false,
        audienceMode: 'adult-only',
        placements: { homeBanner: false, historyNative: false },
      },
    });
    expect(publicClientConfig({ ...enabled, historyNativeEnabled: false }).ads.placements).toEqual({
      homeBanner: false,
      historyNative: false,
    });
  });

  it.each(['unknown', 'child'] as const)('fails closed for %s audience', (audienceMode) => {
    expect(publicClientConfig({ ...enabled, audienceMode })).toEqual({
      ads: {
        enabled: false,
        audienceMode,
        placements: { homeBanner: false, historyNative: false },
      },
    });
  });

  it('keeps every placement off while the global switch is disabled', () => {
    expect(publicClientConfig({ ...enabled, enabled: false }).ads).toMatchObject({
      enabled: false,
      placements: { homeBanner: false, historyNative: false },
    });
  });

  it('serves a no-store public JSON contract', async () => {
    const app = express();
    app.use('/client-config', createClientConfigRouter(enabled));
    const response = await request(app).get('/client-config');
    expect(response.status).toBe(200);
    expect(response.headers['cache-control']).toContain('no-store');
    expect(response.body).toEqual(publicClientConfig(enabled));
  });
});
