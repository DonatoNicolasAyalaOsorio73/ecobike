import { getFunctions, httpsCallable } from 'firebase/functions';
import type { Checkpoint } from '../utils/routeTracking';

type FinishRouteResult = {
  success: boolean;
  data: { newBalance: number; pointsEarned: number; distanceKm: number; firstRoute: boolean };
};
type QRResult = {
  success: boolean;
  data: { token: string; numericCode: string; expiresAt: string };
};
type ValidateResult = {
  success: boolean;
  data: { rewardName: string; redeemedAt: string };
};

const fn = () => getFunctions();

export async function callFinishRoute(
  checkpoints: Checkpoint[],
  metadata: { startedAt: string; endedAt: string; totalDistanceKm: number },
): Promise<FinishRouteResult> {
  const callable = httpsCallable(fn(), 'finishRoute');
  const res = await callable({ checkpoints, metadata });
  return res.data as FinishRouteResult;
}

export async function callGenerateQRToken(rewardId: string): Promise<QRResult> {
  const callable = httpsCallable(fn(), 'generateQRToken');
  const res = await callable({ rewardId });
  return res.data as QRResult;
}

export async function callValidateRedemption(token: string, partnerId: string): Promise<ValidateResult> {
  const callable = httpsCallable(fn(), 'validateRedemption');
  const res = await callable({ token, partnerId });
  return res.data as ValidateResult;
}
