"use client";

import { useEffect } from "react";
import { hideDonateForToday } from "@/lib/donate";

export function HideDonateToday() {
  useEffect(() => {
    hideDonateForToday();
  }, []);

  return null;
}
