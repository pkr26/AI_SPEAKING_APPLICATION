import { describe, expect, it } from 'vitest';
import request from 'supertest';

import {
  accountAdultEligibilityEnforcementReady,
  createClientConfigRouter,
  publicClientConfig,
  type AdsAudienceMode,
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

  // Every conjunction branch is pinned against its exact output: the readiness
  // gate stays closed no matter how the operator flags combine, and the echoed
  // audienceMode always mirrors the policy input verbatim.
  it('returns the exact fail-closed contract for every operator policy combination', () => {
    for (const audienceMode of ['unknown', 'adult-only', 'child'] as const) {
      for (const policyEnabled of [true, false]) {
        for (const homeBannerEnabled of [true, false]) {
          for (const historyNativeEnabled of [true, false]) {
            expect(
              publicClientConfig({ enabled: policyEnabled, audienceMode, homeBannerEnabled, historyNativeEnabled }),
            ).toEqual({
              ads: {
                enabled: false,
                audienceMode,
                placements: { homeBanner: false, historyNative: false },
              },
            });
          }
        }
      }
    }
  });

  const failClosedCases: ReadonlyArray<readonly [string, AdsPolicyConfig, AdsAudienceMode]> = [
    ['a disabled policy with an adult-only audience', { ...enabled, enabled: false }, 'adult-only'],
    ['an enabled policy with an unknown audience', { ...enabled, audienceMode: 'unknown' }, 'unknown'],
    ['an enabled policy with a child audience', { ...enabled, audienceMode: 'child' }, 'child'],
    ['every placement flag on with eligibility still closed', enabled, 'adult-only'],
    ['only the home banner flag on', { ...enabled, historyNativeEnabled: false }, 'adult-only'],
    ['only the history native flag on', { ...enabled, homeBannerEnabled: false }, 'adult-only'],
    ['every placement flag off', { ...enabled, homeBannerEnabled: false, historyNativeEnabled: false }, 'adult-only'],
  ];

  it.each(failClosedCases)('fails closed for %s', (_label, policy, audienceMode) => {
    expect(publicClientConfig(policy)).toEqual({
      ads: {
        enabled: false,
        audienceMode,
        placements: { homeBanner: false, historyNative: false },
      },
    });
  });

  it('serves the exact fail-closed JSON contract for a disabled child-audience policy', async () => {
    const app = express();
    app.use(
      '/client-config',
      createClientConfigRouter({
        ...enabled,
        enabled: false,
        audienceMode: 'child',
        historyNativeEnabled: false,
      }),
    );
    const response = await request(app).get('/client-config');
    expect(response.status).toBe(200);
    expect(response.headers['cache-control']).toContain('no-store');
    expect(response.body).toEqual({
      ads: { enabled: false, audienceMode: 'child', placements: { homeBanner: false, historyNative: false } },
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
