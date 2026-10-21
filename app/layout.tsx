import { ReactNode } from "react";
import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";

import "@stream-io/video-react-sdk/dist/css/styles.css";
import "react-datepicker/dist/react-datepicker.css";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: {
    default: 'Vaartalav | Video Meetings',
    template: '%s | Vaartalav',
  },
  description:
    'Start instant video meetings, schedule calls, and join your team from Vaartalav.',
  applicationName: 'Vaartalav',
  keywords: ['Vaartalav', 'video meetings', 'online meetings', 'video calls'],
  openGraph: {
    title: 'Vaartalav | Video Meetings',
    description:
      'Start instant video meetings, schedule calls, and join your team from Vaartalav.',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Vaartalav | Video Meetings',
    description:
      'Start instant video meetings, schedule calls, and join your team from Vaartalav.',
  },
  icons: {
    icon: "/icons/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <ClerkProvider
        proxyUrl={
          process.env.NEXT_PUBLIC_BASE_URL
            ? `${process.env.NEXT_PUBLIC_BASE_URL.replace(/\/$/, '')}/__clerk`
            : undefined
        }
        appearance={{
          layout: {
            socialButtonsVariant: "iconButton",
            logoImageUrl: '/icons/logo.svg',
          },
          variables: {
            colorText: "#fff",
            colorPrimary: "#0E78F9",
            colorBackground: "#1C1F2E",
            colorInputBackground: "#252A41",
            colorInputText: "#fff",
          },
        }}
      >
        <body className="font-sans antialiased">
          <Toaster />
          {children}
        </body>
      </ClerkProvider>
    </html>
  );
}
