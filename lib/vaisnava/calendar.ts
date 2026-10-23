import * as A from "astronomy-engine";

// Today's lunar day (tithi), fortnight (pakṣa) and Gauḍīya month, worked out
// astronomically at sunrise in Śrī Māyāpur — the way Vaiṣṇava calendars
// reckon the day. Months are pūrṇimānta and named after Viṣṇu (Gaurābda era,
// which begins at Gaura-pūrṇimā, 1486 CE).

const MAYAPUR = new A.Observer(23.4236, 88.3889, 10);

export const TITHIS = [
  "Pratipat", "Dvitīyā", "Tṛtīyā", "Caturthī", "Pañcamī", "Ṣaṣṭhī", "Saptamī", "Aṣṭamī",
  "Navamī", "Daśamī", "Ekādaśī", "Dvādaśī", "Trayodaśī", "Caturdaśī",
];

// Amānta month index (0 = Caitra … 11 = Phālguna) → Gauḍīya month name.
const GAUDIYA = ["Viṣṇu", "Madhusūdana", "Trivikrama", "Vāmana", "Śrīdhara", "Hṛṣīkeśa", "Padmanābha", "Dāmodara", "Keśava", "Nārāyaṇa", "Mādhava", "Govinda"];
const LUNAR = ["Caitra", "Vaiśākha", "Jyeṣṭha", "Āṣāḍha", "Śrāvaṇa", "Bhādra", "Āśvina", "Kārttika", "Mārgaśīrṣa", "Pauṣa", "Māgha", "Phālguna"];

/** Lahiri ayanāṁśa (degrees) — good to a few arc-minutes for this century. */
function ayanamsa(t: A.AstroTime) {
  return 23.85 + (50.29 / 3600) * (t.ut / 365.25);
}
function siderealSun(t: A.AstroTime) {
  return (((A.SunPosition(t).elon - ayanamsa(t)) % 360) + 360) % 360;
}
function elongation(t: A.AstroTime) {
  return A.MoonPhase(t); // 0..360: moon − sun
}

export type TodayTithi = {
  tithi: string;
  /** 1–15 within the pakṣa (15 = Pūrṇimā / Amāvāsyā). */
  number: number;
  paksa: "Gaura" | "Kṛṣṇa";
  month: string;
  lunarMonth: string;
  adhika: boolean;
  gaurabda: number;
  sunrise: Date | null;
  ekadasi: boolean;
};

export function tithiFor(date: Date): TodayTithi {
  // Sunrise in Māyāpur on this calendar day (IST).
  const ist = new Date(date.getTime() + 5.5 * 3600_000);
  const midnightIst = Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate()) - 5.5 * 3600_000;
  const rise = A.SearchRiseSet(A.Body.Sun, MAYAPUR, +1, new A.AstroTime(new Date(midnightIst)), 1);
  const t = rise ?? new A.AstroTime(new Date(midnightIst + 6 * 3600_000));

  const e = elongation(t);
  const idx = Math.floor(e / 12); // 0..29
  const shukla = idx < 15;
  const number = (idx % 15) + 1;
  const tithi = number === 15 ? (shukla ? "Pūrṇimā" : "Amāvāsyā") : TITHIS[number - 1];

  // Amānta month: the solar sign at the new moon that began this lunation.
  let prevNew = A.SearchMoonPhase(0, t.AddDays(-31), 31)!;
  const later = A.SearchMoonPhase(0, prevNew.AddDays(1), 31);
  if (later && later.ut <= t.ut) prevNew = later;
  const nextNew = A.SearchMoonPhase(0, t, 31)!;
  const signA = Math.floor(siderealSun(prevNew) / 30);
  const signB = Math.floor(siderealSun(nextNew) / 30);
  const adhika = signA === signB;
  const amanta = (signA + 1) % 12; // sun in Mīna (11) at new moon → Caitra (0)
  // Pūrṇimānta (Gauḍīya): the dark fortnight already belongs to the next month.
  const month = shukla ? amanta : (amanta + 1) % 12;

  // Gaurābda year turns at Gaura-pūrṇimā (end of Govinda, i.e. Phālguna Pūrṇimā).
  const y = t.date.getUTCFullYear();
  const gm = t.date.getUTCMonth() + 1;
  const gaurabda = month !== 11 && gm >= 3 ? y - 1486 : y - 1487;

  return {
    tithi,
    number,
    paksa: shukla ? "Gaura" : "Kṛṣṇa",
    month: adhika ? "Puruṣottama (adhika)" : GAUDIYA[month],
    lunarMonth: LUNAR[month],
    adhika,
    gaurabda,
    sunrise: rise?.date ?? null,
    ekadasi: number === 11,
  };
}
