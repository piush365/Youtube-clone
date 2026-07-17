import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import OtpDialog from "@/components/OtpDialog";
import { Toaster } from "@/components/ui/sonner";
import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { UserProvider } from "../lib/AuthContext";
import { ThemeProvider } from "../lib/ThemeContext";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <UserProvider>
      <ThemeProvider>
        <div className="min-h-screen bg-background text-foreground">
          <title>Your-Tube Clone</title>
          <Header />
          <Toaster />
          <OtpDialog />
          <div className="flex">
            <Sidebar />
            <Component {...pageProps} />
          </div>
        </div>
      </ThemeProvider>
    </UserProvider>
  );
}
