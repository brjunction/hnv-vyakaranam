"use client";

import { ScriptPicker } from "@/components/scriptures/Panes";
import { useReaderPrefs } from "@/components/scriptures/prefs";

/** The reading script (Devanagari · IAST · Bengali · Odia) for the whole site, from the header. */
export default function HeaderScript() {
  const [prefs, setPrefs] = useReaderPrefs();
  return <ScriptPicker prefs={prefs} setPrefs={setPrefs} />;
}
