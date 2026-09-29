"use client";

import { RecoilRoot } from "recoil";
import { SessionProvider } from "next-auth/react";
import { useState } from "react";

export const Providers = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [mounted, setMounted] = useState(false);

  if (!mounted) {
    setMounted(true);
    return null;
  }

  return (
    <RecoilRoot>
      <SessionProvider>
        {children}
      </SessionProvider>
    </RecoilRoot>
  );
};