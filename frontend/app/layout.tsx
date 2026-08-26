import type { Metadata } from "next";
import { serifFont, sansFont } from "./config/fonts";
import { AuthProvider } from "./context/AuthContext";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Finance Case Presentation Assessor - W. P. Carey School of Business",
  description:
    "AI-powered case presentation assessment platform for finance and real estate programs at Arizona State University",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${serifFont.variable} ${sansFont.variable} antialiased`}
      >
        <AuthProvider>{children}</AuthProvider>
        <Toaster
          position="bottom-left"
          richColors
          toastOptions={{
            style: {
              fontSize: "0.875rem",
              padding: "14px 18px",
              borderRadius: "10px",
            },
            className: "font-sans",
          }}
        />
      </body>
    </html>
  );
}
