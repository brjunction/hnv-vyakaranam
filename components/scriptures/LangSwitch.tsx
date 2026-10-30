"use client";

import { useEffect } from "react";
import { LangPicker } from "@/components/scriptures/Panes";
import { useReaderPrefs } from "@/components/scriptures/prefs";

/** English / हिन्दी for a book's contents pages: chapter titles follow the choice (see .has-hi in globals.css). */
export default function LangSwitch() {
  const [prefs, setPrefs] = useReaderPrefs();
  useEffect(() => {
    document.documentElement.dataset.scrLang = prefs.lang;
  }, [prefs.lang]);
  return <LangPicker prefs={prefs} setPrefs={setPrefs} />;
}
