"use client";

import dynamic from "next/dynamic";

const HomeApp = dynamic(() => import("@/components/HomeApp"), {
  ssr: false,
  loading: () => null,
});

export default function ClientShell() {
  return <HomeApp />;
}
