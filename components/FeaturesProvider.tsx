"use client";

import { createContext, useContext } from "react";
import { NO_FEATURES, type Features } from "@/lib/feature-list";

const Ctx = createContext<Features>(NO_FEATURES);
export default function FeaturesProvider({ value, children }: { value: Features; children: React.ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
/** The developer's switches (/admin/developer). */
export const useFeatures = () => useContext(Ctx);
