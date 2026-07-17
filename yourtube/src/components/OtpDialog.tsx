import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { toast } from "sonner";
import { Mail, Smartphone, ShieldCheck } from "lucide-react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUser } from "@/lib/AuthContext";
import { getUserLocation, isSouthIndia } from "@/lib/locationService";

type Step = "detecting" | "phone" | "sending" | "verify";

// Region-based OTP verification after Google sign-in:
// South Indian states → OTP to registered email; elsewhere → OTP to mobile.
const OtpDialog = () => {
  const { pendingUser, completeOtpVerification, cancelOtpVerification } =
    useUser() as any;

  const [step, setStep] = useState<Step>("detecting");
  const [channel, setChannel] = useState<"email" | "sms">("email");
  const [region, setRegion] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [demoOtp, setDemoOtp] = useState<string | null>(null);
  const [session, setSession] = useState<{
    token: string;
    expiry: number;
    identity: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!pendingUser) return;
    setOtp("");
    setDemoOtp(null);
    setSession(null);
    setStep("detecting");

    (async () => {
      const location = await getUserLocation();
      const south = isSouthIndia(location);
      setRegion(location ? `${location.city}, ${location.region}` : "Unknown");
      if (south) {
        setChannel("email");
        sendOtp("email", pendingUser.email);
      } else {
        setChannel("sms");
        if (pendingUser.phone) {
          setPhone(pendingUser.phone);
          sendOtp("sms", pendingUser.phone);
        } else {
          setStep("phone");
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingUser]);

  const sendOtp = async (ch: "email" | "sms", identity: string) => {
    setStep("sending");
    try {
      const res = await fetch("/api/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: ch,
          email: pendingUser?.email,
          phone: ch === "sms" ? identity : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not send OTP");
      setSession({ token: data.token, expiry: data.expiry, identity });
      if (data.demoOtp) {
        // SMS gateway / SMTP not configured — test mode surfaces the OTP.
        setDemoOtp(data.demoOtp);
      }
      setStep("verify");
      toast.success(
        ch === "email"
          ? `OTP sent to ${pendingUser?.email}`
          : `OTP sent to ${identity}`
      );
    } catch (e: any) {
      toast.error(e.message || "Could not send OTP");
      setStep(ch === "sms" ? "phone" : "verify");
    }
  };

  const handlePhoneSubmit = async () => {
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length < 10) {
      toast.error("Enter a valid 10-digit mobile number");
      return;
    }
    try {
      // Save as the registered mobile number for future logins.
      await updateDoc(doc(db, "users", pendingUser.uid), { phone: cleaned });
    } catch (e) {
      console.error(e);
    }
    sendOtp("sms", cleaned);
  };

  const handleVerify = async () => {
    if (!session || otp.length !== 6) return;
    setBusy(true);
    try {
      const res = await fetch("/api/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          otp,
          identity: session.identity,
          expiry: session.expiry,
          token: session.token,
        }),
      });
      const data = await res.json();
      if (data.valid) {
        toast.success("OTP verified — welcome!");
        completeOtpVerification();
      } else {
        toast.error(data.error || "Incorrect OTP, try again");
      }
    } catch {
      toast.error("Verification failed");
    } finally {
      setBusy(false);
    }
  };

  if (!pendingUser) return null;

  return (
    <Dialog open onOpenChange={(v) => !v && cancelOtpVerification()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-green-500" />
            Verify it&apos;s you
          </DialogTitle>
          <DialogDescription>
            {channel === "email" ? (
              <span className="flex items-center gap-1">
                <Mail className="w-4 h-4" /> Logging in from {region} (South
                India) — an OTP has been sent to your registered email.
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <Smartphone className="w-4 h-4" /> Logging in from {region} —
                an OTP will be sent to your registered mobile number.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {step === "detecting" || step === "sending" ? (
          <p className="text-sm text-muted-foreground py-4">
            {step === "detecting"
              ? "Detecting your location..."
              : "Sending OTP..."}
          </p>
        ) : step === "phone" ? (
          <div className="space-y-3">
            <Input
              placeholder="Registered mobile number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              inputMode="numeric"
            />
            <Button className="w-full" onClick={handlePhoneSubmit}>
              Send OTP
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {demoOtp && (
              <p className="text-xs rounded bg-muted p-2">
                Test mode ({channel === "sms" ? "SMS gateway" : "SMTP"} not
                configured): your OTP is{" "}
                <span className="font-bold tracking-widest">{demoOtp}</span>
              </p>
            )}
            <Input
              placeholder="Enter 6-digit OTP"
              value={otp}
              maxLength={6}
              inputMode="numeric"
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              className="text-center text-lg tracking-[0.5em]"
            />
            <Button
              className="w-full"
              onClick={handleVerify}
              disabled={otp.length !== 6 || busy}
            >
              {busy ? "Verifying..." : "Verify OTP"}
            </Button>
            <button
              className="text-xs text-muted-foreground underline w-full"
              onClick={() =>
                sendOtp(channel, channel === "sms" ? phone : pendingUser.email)
              }
            >
              Resend OTP
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default OtpDialog;
