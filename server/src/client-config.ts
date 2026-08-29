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
 * Release guard for account-level ad eligibility. Operator configuration can
 * describe an intended audience, but it cannot prove that the authenticated
 * learner is an adult. This deliberately returns false until a reviewed,
 * per-account adult-eligibility flow is implemented end to end.
 */
export function accountAdultEligibilityEnforcementReady(): boolean {
  return false;
}

/**
 * Fail closed until adult eligibility is enforced for each account. The
 * operator and placement switches remain part of the future rollout gate, but
 * cannot enable ads by themselves.
 */
export function publicClientConfig(policy: AdsPolicyConfig): PublicClientConfig {
  const eligible = accountAdultEligibilityEnforcementReady() && policy.enabled && policy.audienceMode === 'adult-only';
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
