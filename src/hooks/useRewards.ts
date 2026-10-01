import { useCallback, useEffect, useState } from "react";
import { fetchRewardsCatalog, getLocalRedemptions, redeemReward } from "@/services/rewards.service";
import type { Redemption, Reward } from "@/types/reward";

export function useRewards(userId: string | null, isRealAccount: boolean) {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [usingRealCatalog, setUsingRealCatalog] = useState(false);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { rewards: catalog, usingRealCatalog: real } = await fetchRewardsCatalog();
    setRewards(catalog);
    setUsingRealCatalog(real);
    if (userId) setRedemptions(getLocalRedemptions(userId));
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const redeem = useCallback(
    async (reward: Reward, availablePoints: number) => {
      if (!userId) throw new Error("Necesitas una sesión para canjear recompensas.");
      const redemption = await redeemReward(userId, reward, availablePoints, isRealAccount);
      setRedemptions((prev) => [redemption, ...prev]);
      return redemption;
    },
    [userId, isRealAccount]
  );

  return { rewards, usingRealCatalog, redemptions, loading, redeem, refresh };
}
