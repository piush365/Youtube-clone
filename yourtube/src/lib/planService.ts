import {
  doc,
  updateDoc,
  addDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";

export type PlanId = "free" | "bronze" | "silver" | "gold";

export interface Plan {
  id: PlanId;
  label: string;
  price: number; // rupees
  watchMinutes: number | null; // null = unlimited
  perks: string[];
}

export const PLANS: Plan[] = [
  {
    id: "free",
    label: "Free",
    price: 0,
    watchMinutes: 5,
    perks: ["Watch videos up to 5 minutes", "1 video download per day"],
  },
  {
    id: "bronze",
    label: "Bronze",
    price: 10,
    watchMinutes: 7,
    perks: ["Watch videos up to 7 minutes", "Email invoice on purchase"],
  },
  {
    id: "silver",
    label: "Silver",
    price: 50,
    watchMinutes: 10,
    perks: ["Watch videos up to 10 minutes", "Email invoice on purchase"],
  },
  {
    id: "gold",
    label: "Gold",
    price: 100,
    watchMinutes: null,
    perks: ["Unlimited watch time", "Email invoice on purchase"],
  },
];

export const getPlan = (planId?: string): Plan =>
  PLANS.find((p) => p.id === planId) || PLANS[0];

// Seconds a user may watch per video, or null for unlimited.
export const getWatchLimitSeconds = (planId?: string): number | null => {
  const plan = getPlan(planId);
  return plan.watchMinutes === null ? null : plan.watchMinutes * 60;
};

export const upgradeUserPlan = async (
  uid: string,
  planId: PlanId,
  payment: { paymentId: string; amount: number }
) => {
  await updateDoc(doc(db, "users", uid), { plan: planId });
  await addDoc(collection(db, "payments"), {
    userid: uid,
    type: "plan",
    plan: planId,
    amount: payment.amount,
    paymentId: payment.paymentId,
    paidon: serverTimestamp(),
  });
};

export const setPremiumDownloads = async (
  uid: string,
  payment: { paymentId: string; amount: number }
) => {
  await updateDoc(doc(db, "users", uid), { premiumDownloads: true });
  await addDoc(collection(db, "payments"), {
    userid: uid,
    type: "premium-downloads",
    amount: payment.amount,
    paymentId: payment.paymentId,
    paidon: serverTimestamp(),
  });
};
