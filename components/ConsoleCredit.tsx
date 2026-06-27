"use client";

import { useEffect } from "react";
import { GITHUB_URL } from "@/lib/site";

export default function ConsoleCredit() {
  useEffect(() => {
    console.log(
      `%cHecho con amor y sin fines de lucro por ${GITHUB_URL}`,
      "color:#f87171;font-weight:bold;font-size:12px;",
    );
  }, []);

  return null;
}
