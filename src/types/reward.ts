export interface Reward {
  id: string;
  title: string;
  subtitle: string;
  details: string;
  pointsCost: number;
  icon: string; // Ionicons name
}

export interface Redemption {
  id: string;
  rewardId: string;
  rewardTitle: string;
  pointsSpent: number;
  code: string;
  redeemedAt: number;
}

// Works with zero backend configuration — a real Firestore-backed catalog
// (rewards.service.ts) replaces this the moment Firebase is configured, but
// the redemption flow (points math, codes, "Mis códigos") is fully usable
// without it, same local-first principle as ride tracking.
export const DEFAULT_REWARDS: Reward[] = [
  {
    id: "coldest-2x1",
    title: "Coldest",
    subtitle: "2x1 en bebida a tu elección",
    details: "Presenta tu código en cualquier tienda Coldest para reclamar un 2x1 en bebidas frías.",
    pointsCost: 80,
    icon: "cafe-outline",
  },
  {
    id: "bike-shop-discount",
    title: "BikeShop",
    subtitle: "15% de descuento en accesorios",
    details: "Válido en tienda física y en línea. No acumulable con otras promociones.",
    pointsCost: 150,
    icon: "bicycle-outline",
  },
  {
    id: "eco-market-voucher",
    title: "EcoMarket",
    subtitle: "Bono de $10.000 en productos orgánicos",
    details: "Canjeable por un bono de compra en cualquier sede EcoMarket.",
    pointsCost: 200,
    icon: "leaf-outline",
  },
  {
    id: "free-repair",
    title: "Taller CicloFix",
    subtitle: "Revisión y ajuste gratis",
    details: "Incluye ajuste de frenos, cambios y presión de llantas. Agenda con tu código.",
    pointsCost: 120,
    icon: "construct-outline",
  },
];
