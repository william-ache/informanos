"use client";

import dynamic from "next/dynamic";

const HomeApp = dynamic(() => import("@/components/HomeApp"), {
  ssr: false,
  loading: () => null,
});

const ConsoleCredit = dynamic(() => import("@/components/ConsoleCredit"), {
  ssr: false,
});

export default function ClientShell() {
  return (
    <>
      <ConsoleCredit />
      <HomeApp />
    </>
  );
}
