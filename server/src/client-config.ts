import { Router } from 'express';

export type AdsAudienceMode = 'unknown' | 'adult-only' | 'child';

export interface AdsPolicyConfig {
  enabled: boolean;
  audienceMode: AdsAudienceMode;
  homeBannerEnabled: boolean;
  historyNativeEnabled: boolean;
}

export interface PublicClientConfig {
  ads: {
    enabled: boolean;
    audienceMode: AdsAudienceMode;
    placements: {
      homeBanner: boolean;
      historyNative: boolean;
    };
  };
}

/**
 * Fail closed unless the operator enabled ads and explicitly attested that the
 * product audience is adult-only. Unknown and child audiences never receive
 * an enabled placement, even if a placement flag was accidentally switched on.
 */
export function publicClientConfig(policy: AdsPolicyConfig): PublicClientConfig {
  const eligible = policy.enabled && policy.audienceMode === 'adult-only';
  return {
    ads: {
      enabled: eligible,
      audienceMode: policy.audienceMode,
      placements: {
        homeBanner: eligible && policy.homeBannerEnabled,
        historyNative: eligible && policy.historyNativeEnabled,
      },
    },
  };
}

export function createClientConfigRouter(policy: AdsPolicyConfig): Router {
  const router = Router();
  // Stryker disable next-line StringLiteral: Express intentionally aliases an
  // empty router path and '/' to the same mounted route; supertest pins the
  // externally observable /client-config contract.
  router.get('/', (_req, res) => {
    res.set('Cache-Control', 'no-store');
    res.json(publicClientConfig(policy));
  });
  return router;
}
