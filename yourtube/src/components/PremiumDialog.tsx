import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Crown } from "lucide-react";
import { toast } from "sonner";
import { useUser } from "@/lib/AuthContext";
import { payWithRazorpay } from "@/lib/razorpay";
import { setPremiumDownloads } from "@/lib/planService";

export const PREMIUM_DOWNLOADS_PRICE = 99;

const PremiumDialog = ({
  open,
  onClose,
  onUpgraded,
}: {
  open: boolean;
  onClose: () => void;
  onUpgraded?: () => void;
}) => {
  const { user, login } = useUser();
  const [paying, setPaying] = useState(false);

  const handleUpgrade = async () => {
    if (!user) return;
    setPaying(true);
    try {
      const payment = await payWithRazorpay({
        amountInRupees: PREMIUM_DOWNLOADS_PRICE,
        description: "YourTube Premium — unlimited downloads",
        name: user.name,
        email: user.email,
      });
      await setPremiumDownloads(user.uid, {
        paymentId: payment.paymentId,
        amount: PREMIUM_DOWNLOADS_PRICE,
      });
      login({ ...user, premiumDownloads: true });
      toast.success("You are now a Premium member — unlimited downloads!");
      onUpgraded?.();
      onClose();
    } catch (e: any) {
      if (e?.message !== "Payment cancelled") {
        toast.error(e?.message || "Payment failed");
      }
    } finally {
      setPaying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-yellow-500" />
            Upgrade to Premium
          </DialogTitle>
          <DialogDescription>
            Free users can download 1 video per day. Go Premium for unlimited
            video downloads.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-lg border p-4 space-y-2">
          <p className="text-2xl font-bold">
            ₹{PREMIUM_DOWNLOADS_PRICE}
            <span className="text-sm font-normal text-muted-foreground">
              {" "}
              one-time (test payment)
            </span>
          </p>
          <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
            <li>Unlimited video downloads</li>
            <li>Videos saved to your Downloads section</li>
            <li>Secure payment via Razorpay</li>
          </ul>
        </div>
        <Button
          className="w-full bg-red-600 hover:bg-red-700 text-white"
          onClick={handleUpgrade}
          disabled={paying || !user}
        >
          {paying ? "Processing..." : "Pay with Razorpay"}
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default PremiumDialog;
