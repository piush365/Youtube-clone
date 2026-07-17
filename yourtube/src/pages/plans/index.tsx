import React, { useState } from "react";
import { Check, Crown } from "lucide-react";
import { toast } from "sonner";
import { useUser } from "@/lib/AuthContext";
import { PLANS, PlanId, upgradeUserPlan, getPlan } from "@/lib/planService";
import { payWithRazorpay } from "@/lib/razorpay";
import { Button } from "@/components/ui/button";
import PremiumDialog from "@/components/PremiumDialog";

const PlansPage = () => {
  const { user, login, handlegooglesignin } = useUser();
  const [payingPlan, setPayingPlan] = useState<PlanId | null>(null);
  const [premiumOpen, setPremiumOpen] = useState(false);

  const currentPlan = getPlan(user?.plan);

  const handleUpgrade = async (planId: PlanId) => {
    if (!user) {
      toast.error("Sign in to upgrade your plan");
      handlegooglesignin();
      return;
    }
    const plan = PLANS.find((p) => p.id === planId)!;
    setPayingPlan(planId);
    try {
      const payment = await payWithRazorpay({
        amountInRupees: plan.price,
        description: `YourTube ${plan.label} plan`,
        name: user.name,
        email: user.email,
      });

      await upgradeUserPlan(user.uid, planId, {
        paymentId: payment.paymentId,
        amount: plan.price,
      });
      login({ ...user, plan: planId });

      // Email the invoice; non-fatal if SMTP isn't configured.
      try {
        const res = await fetch("/api/send-invoice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: user.email,
            name: user.name,
            plan: plan.label,
            amount: plan.price,
            paymentId: payment.paymentId,
          }),
        });
        const data = await res.json();
        if (data.sent) {
          toast.success(
            `Upgraded to ${plan.label}! Invoice sent to ${user.email}`
          );
        } else {
          toast.success(
            `Upgraded to ${plan.label}! (Invoice email pending — SMTP not configured)`
          );
        }
      } catch {
        toast.success(`Upgraded to ${plan.label}!`);
      }
    } catch (e: any) {
      if (e?.message !== "Payment cancelled") {
        toast.error(e?.message || "Payment failed");
      }
    } finally {
      setPayingPlan(null);
    }
  };

  return (
    <div className="flex-1 p-4 md:p-8 max-w-6xl">
      <h1 className="text-2xl font-bold mb-1">Upgrade your plan</h1>
      <p className="text-muted-foreground mb-6">
        Watch longer with Bronze, Silver or Gold. Payments run through Razorpay
        (test mode) and you get an invoice by email.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {PLANS.map((plan) => {
          const isCurrent = currentPlan.id === plan.id;
          return (
            <div
              key={plan.id}
              className={`border rounded-xl p-5 flex flex-col ${
                plan.id === "gold"
                  ? "border-yellow-500 shadow-lg"
                  : isCurrent
                  ? "border-red-500"
                  : ""
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-semibold capitalize">
                  {plan.label}
                </h2>
                {plan.id === "gold" && (
                  <Crown className="w-5 h-5 text-yellow-500" />
                )}
              </div>
              <p className="text-3xl font-bold mb-1">
                {plan.price === 0 ? "Free" : `₹${plan.price}`}
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                {plan.watchMinutes === null
                  ? "Unlimited watch time"
                  : `${plan.watchMinutes} minutes per video`}
              </p>
              <ul className="text-sm space-y-2 mb-6 flex-1">
                {plan.perks.map((perk) => (
                  <li key={perk} className="flex items-start gap-2">
                    <Check className="w-4 h-4 mt-0.5 text-green-500 shrink-0" />
                    {perk}
                  </li>
                ))}
              </ul>
              {isCurrent ? (
                <Button variant="secondary" disabled>
                  Current plan
                </Button>
              ) : plan.price === 0 ? (
                <Button variant="outline" disabled>
                  Default plan
                </Button>
              ) : (
                <Button
                  className="bg-red-600 hover:bg-red-700 text-white"
                  onClick={() => handleUpgrade(plan.id)}
                  disabled={payingPlan !== null}
                >
                  {payingPlan === plan.id
                    ? "Processing..."
                    : `Upgrade — ₹${plan.price}`}
                </Button>
              )}
            </div>
          );
        })}
      </div>

      <div className="border rounded-xl p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Crown className="w-5 h-5 text-yellow-500" />
            Premium Downloads
          </h2>
          <p className="text-sm text-muted-foreground">
            Free users can download 1 video per day. Premium unlocks unlimited
            downloads.
          </p>
        </div>
        {user?.premiumDownloads ? (
          <span className="text-sm font-medium text-yellow-500">
            Premium active — unlimited downloads
          </span>
        ) : (
          <Button variant="outline" onClick={() => setPremiumOpen(true)}>
            Go Premium — ₹99
          </Button>
        )}
      </div>
      <PremiumDialog open={premiumOpen} onClose={() => setPremiumOpen(false)} />
    </div>
  );
};

export default PlansPage;
