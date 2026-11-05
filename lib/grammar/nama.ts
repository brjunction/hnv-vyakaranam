// Nāma declension (śabda-rūpa) by Madhyama Harināmāmṛta-vyākaraṇa, Nāma-
// prakaraṇa (Sūtras 87–259). Each form lists the sūtras that make it, in order.
// Templates: "~" = the stem without its final letter(s) given by the class.

export type Cell = { forms: string[]; sutras: number[] };
export type Table = { stem: string; gender: "m" | "f" | "n"; cls: string; label: string; cells: Cell[][]; note?: string };

export const CASES = ["Prathamā (nom.)", "Dvitīyā (acc.)", "Tṛtīyā (ins.)", "Caturthī (dat.)", "Pañcamī (abl.)", "Ṣaṣṭhī (gen.)", "Saptamī (loc.)", "Sambodhana (voc.)"];
export const NUMBERS = ["eka-vacana", "dvi-vacana", "bahu-vacana"];
/** The case endings of Sūtra 90, by case and number (voc. = su as buddha, Sūtra 109). */
export const ENDINGS = [
  ["su", "au", "jas"],
  ["am", "au", "śas"],
  ["ṭā", "bhyām", "bhis"],
  ["ṅe", "bhyām", "bhyas"],
  ["ṅasi", "bhyām", "bhyas"],
  ["ṅas", "os", "ām"],
  ["ṅi", "os", "sup"],
  ["su", "au", "jas"],
];

type T = [string, number[]];
type Paradigm = { strip: number; rows: T[][]; label: string; note?: string };

const A_COMMON = (pl: string): T[][] => [
  [["~ena", [97, 43]], ["~ābhyām", [98]], ["~aiḥ", [99, 48, 93]]],
  [["~āya", [100, 98]], ["~ābhyām", [98]], ["~ebhyaḥ", [101, 93]]],
  [["~āt", [102, 42]], ["~ābhyām", [98]], ["~ebhyaḥ", [101, 93]]],
  [["~asya", [103]], ["~ayoḥ", [104, 54, 93]], ["~ānām", [105, 107]]],
  [["~e", [43]], ["~ayoḥ", [104, 54, 93]], [pl, [101, 108]]],
];

const P: Record<string, Paradigm> = {
  "a-m": {
    strip: 1, label: "a-ending masculine (kṛṣṇa-saṁjña, Sūtra 96)",
    rows: [
      [["~aḥ", [90, 91, 93]], ["~au", [48]], ["~āḥ", [42, 93]]],
      [["~am", [94]], ["~au", [48]], ["~ān", [95]]],
      ...A_COMMON("~eṣu"),
      [["~a", [109, 110]], ["~au", [48]], ["~āḥ", [42, 93]]],
    ],
  },
  "a-n": {
    strip: 1, label: "a-ending neuter (brahma-liṅga)",
    rows: [
      [["~am", [157, 94]], ["~e", [144, 43]], ["~āni", [158, 159, 163]]],
      [["~am", [157, 94]], ["~e", [144, 43]], ["~āni", [158, 159, 163]]],
      ...A_COMMON("~eṣu"),
      [["~a", [109, 110]], ["~e", [144, 43]], ["~āni", [158, 159, 163]]],
    ],
  },
  "ā-f": {
    strip: 1, label: "ā-ending feminine (rādhā-saṁjña, Sūtra 143)",
    rows: [
      [["~ā", [138]], ["~e", [144, 43]], ["~āḥ", [42, 93]]],
      [["~ām", [94]], ["~e", [144, 43]], ["~āḥ", [42, 93]]],
      [["~ayā", [145, 54]], ["~ābhyām", []], ["~ābhiḥ", [93]]],
      [["~āyai", [146, 48]], ["~ābhyām", []], ["~ābhyaḥ", [93]]],
      [["~āyāḥ", [146, 42, 93]], ["~ābhyām", []], ["~ābhyaḥ", [93]]],
      [["~āyāḥ", [146, 42, 93]], ["~ayoḥ", [145, 54, 93]], ["~ānām", [105]]],
      [["~āyām", [135, 146]], ["~ayoḥ", [145, 54, 93]], ["~āsu", []]],
      [["~e", [145, 110]], ["~e", [144, 43]], ["~āḥ", [42, 93]]],
    ],
  },
  "i-m": {
    strip: 1, label: "i-ending masculine (hari-saṁjña, Sūtra 115)",
    rows: [
      [["~iḥ", [93]], ["~ī", [116]], ["~ayaḥ", [119, 54, 93]]],
      [["~im", [94]], ["~ī", [116]], ["~īn", [95]]],
      [["~inā", [120]], ["~ibhyām", []], ["~ibhiḥ", [93]]],
      [["~aye", [119, 54]], ["~ibhyām", []], ["~ibhyaḥ", [93]]],
      [["~eḥ", [119, 121, 93]], ["~ibhyām", []], ["~ibhyaḥ", [93]]],
      [["~eḥ", [119, 121, 93]], ["~yoḥ", [50, 93]], ["~īnām", [105, 107]]],
      [["~au", [122]], ["~yoḥ", [50, 93]], ["~iṣu", [108]]],
      [["~e", [119, 110]], ["~ī", [116]], ["~ayaḥ", [119, 54, 93]]],
    ],
  },
  "u-m": {
    strip: 1, label: "u-ending masculine (hari-saṁjña, Sūtra 115)",
    rows: [
      [["~uḥ", [93]], ["~ū", [116]], ["~avaḥ", [119, 55, 93]]],
      [["~um", [94]], ["~ū", [116]], ["~ūn", [95]]],
      [["~unā", [120]], ["~ubhyām", []], ["~ubhiḥ", [93]]],
      [["~ave", [119, 55]], ["~ubhyām", []], ["~ubhyaḥ", [93]]],
      [["~oḥ", [119, 121, 93]], ["~ubhyām", []], ["~ubhyaḥ", [93]]],
      [["~oḥ", [119, 121, 93]], ["~voḥ", [51, 93]], ["~ūnām", [105, 107]]],
      [["~au", [122]], ["~voḥ", [51, 93]], ["~uṣu", [108]]],
      [["~o", [119, 110]], ["~ū", [116]], ["~avaḥ", [119, 55, 93]]],
    ],
  },
  "i-f": {
    strip: 1, label: "i-ending feminine (hari-saṁjña; lakṣmī, Sūtra 150)",
    rows: [
      [["~iḥ", [93]], ["~ī", [116]], ["~ayaḥ", [119, 54, 93]]],
      [["~im", [94]], ["~ī", [116]], ["~īḥ", [95, 93]]],
      [["~yā", [120, 50]], ["~ibhyām", []], ["~ibhiḥ", [93]]],
      [["~aye/~yai", [119, 54, 150, 48]], ["~ibhyām", []], ["~ibhyaḥ", [93]]],
      [["~eḥ/~yāḥ", [119, 121, 150]], ["~ibhyām", []], ["~ibhyaḥ", [93]]],
      [["~eḥ/~yāḥ", [119, 121, 150]], ["~yoḥ", [50, 93]], ["~īnām", [105, 107]]],
      [["~au/~yām", [122, 150, 135]], ["~yoḥ", [50, 93]], ["~iṣu", [108]]],
      [["~e", [119, 110]], ["~ī", [116]], ["~ayaḥ", [119, 54, 93]]],
    ],
  },
  "u-f": {
    strip: 1, label: "u-ending feminine (hari-saṁjña; lakṣmī, Sūtra 150)",
    rows: [
      [["~uḥ", [93]], ["~ū", [116]], ["~avaḥ", [119, 55, 93]]],
      [["~um", [94]], ["~ū", [116]], ["~ūḥ", [95, 93]]],
      [["~vā", [120, 51]], ["~ubhyām", []], ["~ubhiḥ", [93]]],
      [["~ave/~vai", [119, 55, 150, 48]], ["~ubhyām", []], ["~ubhyaḥ", [93]]],
      [["~oḥ/~vāḥ", [119, 121, 150]], ["~ubhyām", []], ["~ubhyaḥ", [93]]],
      [["~oḥ/~vāḥ", [119, 121, 150]], ["~voḥ", [51, 93]], ["~ūnām", [105, 107]]],
      [["~au/~vām", [122, 150, 135]], ["~voḥ", [51, 93]], ["~uṣu", [108]]],
      [["~o", [119, 110]], ["~ū", [116]], ["~avaḥ", [119, 55, 93]]],
    ],
  },
  "i-n": {
    strip: 1, label: "i-ending neuter (brahma-liṅga, nuk Sūtra 167)",
    rows: [
      [["~i", [166]], ["~inī", [144, 167]], ["~īni", [158, 159, 163]]],
      [["~i", [166]], ["~inī", [144, 167]], ["~īni", [158, 159, 163]]],
      [["~inā", [167]], ["~ibhyām", []], ["~ibhiḥ", [93]]],
      [["~ine", [167]], ["~ibhyām", []], ["~ibhyaḥ", [93]]],
      [["~inaḥ", [167, 93]], ["~ibhyām", []], ["~ibhyaḥ", [93]]],
      [["~inaḥ", [167, 93]], ["~inoḥ", [167, 93]], ["~īnām", [105, 107]]],
      [["~ini", [167]], ["~inoḥ", [167, 93]], ["~iṣu", [108]]],
      [["~i/~e", [166, 119]], ["~inī", [144, 167]], ["~īni", [158, 159, 163]]],
    ],
  },
  "u-n": {
    strip: 1, label: "u-ending neuter (brahma-liṅga, nuk Sūtra 167)",
    rows: [
      [["~u", [166]], ["~unī", [144, 167]], ["~ūni", [158, 159, 163]]],
      [["~u", [166]], ["~unī", [144, 167]], ["~ūni", [158, 159, 163]]],
      [["~unā", [167]], ["~ubhyām", []], ["~ubhiḥ", [93]]],
      [["~une", [167]], ["~ubhyām", []], ["~ubhyaḥ", [93]]],
      [["~unaḥ", [167, 93]], ["~ubhyām", []], ["~ubhyaḥ", [93]]],
      [["~unaḥ", [167, 93]], ["~unoḥ", [167, 93]], ["~ūnām", [105, 107]]],
      [["~uni", [167]], ["~unoḥ", [167, 93]], ["~uṣu", [108]]],
      [["~u/~o", [166, 119]], ["~unī", [144, 167]], ["~ūni", [158, 159, 163]]],
    ],
  },
  "ī-f": {
    strip: 1, label: "ī-ending feminine (gopī-saṁjña, Sūtra 153)",
    rows: [
      [["~ī", [138]], ["~yau", [50]], ["~yaḥ", [50, 93]]],
      [["~īm", [94]], ["~yau", [50]], ["~īḥ", [95, 93]]],
      [["~yā", [50]], ["~ībhyām", []], ["~ībhiḥ", [93]]],
      [["~yai", [150, 48, 50]], ["~ībhyām", []], ["~ībhyaḥ", [93]]],
      [["~yāḥ", [150, 42, 50, 93]], ["~ībhyām", []], ["~ībhyaḥ", [93]]],
      [["~yāḥ", [150, 42, 50, 93]], ["~yoḥ", [50, 93]], ["~īnām", [105]]],
      [["~yām", [135, 150, 50]], ["~yoḥ", [50, 93]], ["~īṣu", [108]]],
      [["~i", [147]], ["~yau", [50]], ["~yaḥ", [50, 93]]],
    ],
  },
  "ū-f": {
    strip: 1, label: "ū-ending feminine (gopī-saṁjña, Sūtra 153)",
    rows: [
      [["~ūḥ", [93]], ["~vau", [51]], ["~vaḥ", [51, 93]]],
      [["~ūm", [94]], ["~vau", [51]], ["~ūḥ", [95, 93]]],
      [["~vā", [51]], ["~ūbhyām", []], ["~ūbhiḥ", [93]]],
      [["~vai", [150, 48, 51]], ["~ūbhyām", []], ["~ūbhyaḥ", [93]]],
      [["~vāḥ", [150, 42, 51, 93]], ["~ūbhyām", []], ["~ūbhyaḥ", [93]]],
      [["~vāḥ", [150, 42, 51, 93]], ["~voḥ", [51, 93]], ["~ūnām", [105]]],
      [["~vām", [135, 150, 51]], ["~voḥ", [51, 93]], ["~ūṣu", [108]]],
      [["~u", [147]], ["~vau", [51]], ["~vaḥ", [51, 93]]],
    ],
  },
  "ṛ-agent": {
    strip: 1, label: "ṛ-ending agent noun (tṛn/tṛc, vṛṣṇīndra Sūtra 139)",
    rows: [
      [["~ā", [127]], ["~ārau", [139]], ["~āraḥ", [139, 93]]],
      [["~āram", [139]], ["~ārau", [139]], ["~ṝn", [95]]],
      [["~rā", [52]], ["~ṛbhyām", []], ["~ṛbhiḥ", [93]]],
      [["~re", [52]], ["~ṛbhyām", []], ["~ṛbhyaḥ", [93]]],
      [["~uḥ", [137]], ["~ṛbhyām", []], ["~ṛbhyaḥ", [93]]],
      [["~uḥ", [137]], ["~roḥ", [52, 93]], ["~ṝṇām", [105, 107, 111]]],
      [["~ari", [136]], ["~roḥ", [52, 93]], ["~ṛṣu", [108]]],
      [["~aḥ", [136, 93]], ["~ārau", [139]], ["~āraḥ", [139, 93]]],
    ],
  },
  "ṛ-rel": {
    strip: 1, label: "ṛ-ending relation noun (govinda Sūtra 136)",
    rows: [
      [["~ā", [127]], ["~arau", [136]], ["~araḥ", [136, 93]]],
      [["~aram", [136]], ["~arau", [136]], ["~ṝn", [95]]],
      [["~rā", [52]], ["~ṛbhyām", []], ["~ṛbhiḥ", [93]]],
      [["~re", [52]], ["~ṛbhyām", []], ["~ṛbhyaḥ", [93]]],
      [["~uḥ", [137]], ["~ṛbhyām", []], ["~ṛbhyaḥ", [93]]],
      [["~uḥ", [137]], ["~roḥ", [52, 93]], ["~ṝṇām", [105, 107, 111]]],
      [["~ari", [136]], ["~roḥ", [52, 93]], ["~ṛṣu", [108]]],
      [["~aḥ", [136, 93]], ["~arau", [136]], ["~araḥ", [136, 93]]],
    ],
  },
  "an-m": {
    strip: 2, label: "an-ending masculine (Sūtras 163, 170, 190)",
    rows: [
      [["~ā", [163, 190]], ["~ānau", [163]], ["~ānaḥ", [163, 93]]],
      [["~ānam", [163]], ["~ānau", [163]], ["~#aḥ", [170, 93]]],
      [["~#ā", [170]], ["~abhyām", [190]], ["~abhiḥ", [190, 93]]],
      [["~#e", [170]], ["~abhyām", [190]], ["~abhyaḥ", [190, 93]]],
      [["~#aḥ", [170, 93]], ["~abhyām", [190]], ["~abhyaḥ", [190, 93]]],
      [["~#aḥ", [170, 93]], ["~#oḥ", [170, 93]], ["~#ām", [170]]],
      [["~#i/~ani", [170]], ["~#oḥ", [170, 93]], ["~asu", [190]]],
      [["~an", [190]], ["~ānau", [163]], ["~ānaḥ", [163, 93]]],
    ],
  },
  "an-n": {
    strip: 2, label: "an-ending neuter (Sūtras 166, 170, 190, 215)",
    rows: [
      [["~a", [166, 190]], ["~#ī/~anī", [144, 170]], ["~āni", [158, 163]]],
      [["~a", [166, 190]], ["~#ī/~anī", [144, 170]], ["~āni", [158, 163]]],
      [["~#ā", [170]], ["~abhyām", [190]], ["~abhiḥ", [190, 93]]],
      [["~#e", [170]], ["~abhyām", [190]], ["~abhyaḥ", [190, 93]]],
      [["~#aḥ", [170, 93]], ["~abhyām", [190]], ["~abhyaḥ", [190, 93]]],
      [["~#aḥ", [170, 93]], ["~#oḥ", [170, 93]], ["~#ām", [170]]],
      [["~#i/~ani", [170]], ["~#oḥ", [170, 93]], ["~asu", [190]]],
      [["~an/~a", [215]], ["~#ī/~anī", [144, 170]], ["~āni", [158, 163]]],
    ],
  },
  "in-m": {
    strip: 2, label: "in-ending masculine (Sūtras 196, 190)",
    rows: [
      [["~ī", [196, 190]], ["~inau", []], ["~inaḥ", [93]]],
      [["~inam", []], ["~inau", []], ["~inaḥ", [93]]],
      [["~inā", []], ["~ibhyām", [190]], ["~ibhiḥ", [190, 93]]],
      [["~ine", []], ["~ibhyām", [190]], ["~ibhyaḥ", [190, 93]]],
      [["~inaḥ", [93]], ["~ibhyām", [190]], ["~ibhyaḥ", [190, 93]]],
      [["~inaḥ", [93]], ["~inoḥ", [93]], ["~inām", []]],
      [["~ini", []], ["~inoḥ", [93]], ["~iṣu", [190, 108]]],
      [["~in", [190]], ["~inau", []], ["~inaḥ", [93]]],
    ],
  },
  "vat-m": {
    strip: 2, label: "vat / mat masculine (num Sūtra 174, lengthening 187)",
    rows: [
      [["~ān", [174, 187, 176]], ["~antau", [174]], ["~antaḥ", [174, 93]]],
      [["~antam", [174]], ["~antau", [174]], ["~ataḥ", [93]]],
      [["~atā", []], ["~adbhyām", [61]], ["~adbhiḥ", [61, 93]]],
      [["~ate", []], ["~adbhyām", [61]], ["~adbhyaḥ", [61, 93]]],
      [["~ataḥ", [93]], ["~adbhyām", [61]], ["~adbhyaḥ", [61, 93]]],
      [["~ataḥ", [93]], ["~atoḥ", [93]], ["~atām", []]],
      [["~ati", []], ["~atoḥ", [93]], ["~atsu", [63]]],
      [["~an", [174, 176]], ["~antau", [174]], ["~antaḥ", [174, 93]]],
    ],
  },
  "at-m": {
    strip: 2, label: "at-ending masculine participle (num Sūtra 174)",
    rows: [
      [["~an", [174, 176]], ["~antau", [174]], ["~antaḥ", [174, 93]]],
      [["~antam", [174]], ["~antau", [174]], ["~ataḥ", [93]]],
      [["~atā", []], ["~adbhyām", [61]], ["~adbhiḥ", [61, 93]]],
      [["~ate", []], ["~adbhyām", [61]], ["~adbhyaḥ", [61, 93]]],
      [["~ataḥ", [93]], ["~adbhyām", [61]], ["~adbhyaḥ", [61, 93]]],
      [["~ataḥ", [93]], ["~atoḥ", [93]], ["~atām", []]],
      [["~ati", []], ["~atoḥ", [93]], ["~atsu", [63]]],
      [["~an", [174, 176]], ["~antau", [174]], ["~antaḥ", [174, 93]]],
    ],
  },
  "as-n": {
    strip: 2, label: "as-ending neuter (Sūtras 159, 163, 165)",
    rows: [
      [["~aḥ", [166, 93]], ["~asī", [144]], ["~āṁsi", [158, 159, 163, 165]]],
      [["~aḥ", [166, 93]], ["~asī", [144]], ["~āṁsi", [158, 159, 163, 165]]],
      [["~asā", []], ["~obhyām", [93, 80]], ["~obhiḥ", [93, 80]]],
      [["~ase", []], ["~obhyām", [93, 80]], ["~obhyaḥ", [93, 80]]],
      [["~asaḥ", [93]], ["~obhyām", [93, 80]], ["~obhyaḥ", [93, 80]]],
      [["~asaḥ", [93]], ["~asoḥ", [93]], ["~asām", []]],
      [["~asi", []], ["~asoḥ", [93]], ["~aḥsu/~assu", [93]]],
      [["~aḥ", [93]], ["~asī", [144]], ["~āṁsi", [158, 159, 163, 165]]],
    ],
  },
  "t-c": {
    strip: 1, label: "t / d-ending consonant stem (Sūtras 138, 61, 63)",
    rows: [
      [["~t", [138]], ["~tau", []], ["~taḥ", [93]]],
      [["~tam", []], ["~tau", []], ["~taḥ", [93]]],
      [["~tā", []], ["~dbhyām", [61]], ["~dbhiḥ", [61, 93]]],
      [["~te", []], ["~dbhyām", [61]], ["~dbhyaḥ", [61, 93]]],
      [["~taḥ", [93]], ["~dbhyām", [61]], ["~dbhyaḥ", [61, 93]]],
      [["~taḥ", [93]], ["~toḥ", [93]], ["~tām", []]],
      [["~ti", []], ["~toḥ", [93]], ["~tsu", [63]]],
      [["~t", [138]], ["~tau", []], ["~taḥ", [93]]],
    ],
  },
  "c-c": {
    strip: 1, label: "c-ending consonant stem (Sūtras 138, 177, 61, 63)",
    rows: [
      [["~k", [138, 177]], ["~cau", []], ["~caḥ", [93]]],
      [["~cam", []], ["~cau", []], ["~caḥ", [93]]],
      [["~cā", []], ["~gbhyām", [177, 61]], ["~gbhiḥ", [177, 61, 93]]],
      [["~ce", []], ["~gbhyām", [177, 61]], ["~gbhyaḥ", [177, 61, 93]]],
      [["~caḥ", [93]], ["~gbhyām", [177, 61]], ["~gbhyaḥ", [177, 61, 93]]],
      [["~caḥ", [93]], ["~coḥ", [93]], ["~cām", []]],
      [["~ci", []], ["~coḥ", [93]], ["~kṣu", [177, 63, 108]]],
      [["~k", [138, 177]], ["~cau", []], ["~caḥ", [93]]],
    ],
  },
};

// ---------------------------------------------------------------- whole words
type W = [string, number[]];
const fixed = (rows: W[][], label: string, note?: string) => ({ rows, label, note });
const PRON_M = (s: string, nom: string): W[][] => [
  [[nom, [238]], [`${s}au`, [238, 48]], [`${s}e`, [238, 225, 43]]],
  [[`${s}am`, [238, 94]], [`${s}au`, [238, 48]], [`${s}ān`, [238, 95]]],
  [[`${s}ena`, [238, 97, 43]], [`${s}ābhyām`, [238, 98]], [`${s}aiḥ`, [238, 99, 48]]],
  [[`${s}asmai`, [238, 226]], [`${s}ābhyām`, [238, 98]], [`${s}ebhyaḥ`, [238, 101]]],
  [[`${s}asmāt`, [238, 227]], [`${s}ābhyām`, [238, 98]], [`${s}ebhyaḥ`, [238, 101]]],
  [[`${s}asya`, [238, 103]], [`${s}ayoḥ`, [238, 104, 54]], [`${s}eṣām`, [238, 228, 101, 108]]],
  [[`${s}asmin`, [238, 229]], [`${s}ayoḥ`, [238, 104, 54]], [`${s}eṣu`, [238, 101, 108]]],
];
const PRON_F = (s: string, nom: string): W[][] => [
  [[nom, [238, 138]], [`${s}e`, [238, 144, 43]], [`${s}āḥ`, [238, 42]]],
  [[`${s}ām`, [238, 94]], [`${s}e`, [238, 144, 43]], [`${s}āḥ`, [238, 42]]],
  [[`${s}ayā`, [238, 145, 54]], [`${s}ābhyām`, [238]], [`${s}ābhiḥ`, [238]]],
  [[`${s}asyai`, [238, 255, 48]], [`${s}ābhyām`, [238]], [`${s}ābhyaḥ`, [238]]],
  [[`${s}asyāḥ`, [238, 255]], [`${s}ābhyām`, [238]], [`${s}ābhyaḥ`, [238]]],
  [[`${s}asyāḥ`, [238, 255]], [`${s}ayoḥ`, [238, 145, 54]], [`${s}āsām`, [238, 228]]],
  [[`${s}asyām`, [238, 255, 135]], [`${s}ayoḥ`, [238, 145, 54]], [`${s}āsu`, [238]]],
];
const sarvaM = (s: string): W[][] => PRON_M(s, `${s}aḥ`).map((r) => r.map(([f, n]) => [f, n.filter((x) => x !== 238)] as W));
const sarvaF = (s: string): W[][] => PRON_F(s, `${s}ā`).map((r) => r.map(([f, n]) => [f, n.filter((x) => x !== 238)] as W));
const neutTop = (sg: string, pl: string, sgS: number[]): W[][] => [
  [[sg, sgS], [pl.replace(/āni$|āṇi$/, "e"), [144, 43]], [pl, [158, 159, 163]]],
  [[sg, sgS], [pl.replace(/āni$|āṇi$/, "e"), [144, 43]], [pl, [158, 159, 163]]],
];

const WORDS: Record<string, Partial<Record<"m" | "f" | "n", { rows: W[][]; label: string; note?: string }>>> = {
  sarva: { m: fixed(sarvaM("sarv"), "sarvādi (kṛṣṇa-nāma, Sūtra 224)"), f: fixed(sarvaF("sarv"), "sarvādi feminine"), n: fixed([...neutTop("sarvam", "sarvāṇi", [157, 94]), ...sarvaM("sarv").slice(2)], "sarvādi neuter") },
  viśva: { m: fixed(sarvaM("viśv"), "sarvādi (Sūtra 224)"), f: fixed(sarvaF("viśv"), "sarvādi feminine"), n: fixed([...neutTop("viśvam", "viśvāni", [157, 94]), ...sarvaM("viśv").slice(2)], "sarvādi neuter") },
  eka: { m: fixed(sarvaM("ek").map((r) => [r[0]]), "eka: singular only"), f: fixed(sarvaF("ek").map((r) => [r[0]]), "eka feminine"), n: fixed([[["ekam", [157, 94]]], [["ekam", [157, 94]]], ...sarvaM("ek").slice(2).map((r) => [r[0]])], "eka neuter") },
  tad: { m: fixed(PRON_M("t", "saḥ"), "tad (tyad-ādi, Sūtra 238)"), f: fixed(PRON_F("t", "sā"), "tad feminine (Sūtra 238)"), n: fixed([...neutTop("tat", "tāni", [256]), ...PRON_M("t", "").slice(2)], "tad neuter") },
  yad: { m: fixed(PRON_M("y", "yaḥ"), "yad (Sūtra 238)"), f: fixed(PRON_F("y", "yā"), "yad feminine"), n: fixed([...neutTop("yat", "yāni", [256]), ...PRON_M("y", "").slice(2)], "yad neuter") },
  etad: { m: fixed(PRON_M("et", "eṣaḥ").map((r) => r.map(([f, n]) => [f.replace(/^etasy|^eteṣ/, (m) => m), n] as W)), "etad (Sūtras 238, 108)"), f: fixed(PRON_F("et", "eṣā"), "etad feminine"), n: fixed([...neutTop("etat", "etāni", [256]), ...PRON_M("et", "").slice(2)], "etad neuter") },
  kim: { m: fixed(PRON_M("k", "kaḥ").map((r) => r.map(([f, n]) => [f, [254, ...n.filter((x) => x !== 238)]] as W)), "kim (Sūtra 254)"), f: fixed(PRON_F("k", "kā").map((r) => r.map(([f, n]) => [f, [254, ...n.filter((x) => x !== 238)]] as W)), "kim feminine"), n: fixed([...neutTop("kim", "kāni", [166]), ...PRON_M("k", "").slice(2).map((r) => r.map(([f, n]) => [f, [254, ...n.filter((x) => x !== 238)]] as W))], "kim neuter") },
  idam: {
    m: fixed([
      [["ayam", [239]], ["imau", [238, 48]], ["ime", [238, 225]]],
      [["imam", [238, 94]], ["imau", [238]], ["imān", [238, 95]]],
      [["anena", [240]], ["ābhyām", [241]], ["ebhiḥ", [242]]],
      [["asmai", [241, 226]], ["ābhyām", [241]], ["ebhyaḥ", [241, 101]]],
      [["asmāt", [241, 227]], ["ābhyām", [241]], ["ebhyaḥ", [241, 101]]],
      [["asya", [241, 103]], ["anayoḥ", [240]], ["eṣām", [241, 228, 108]]],
      [["asmin", [241, 229]], ["anayoḥ", [240]], ["eṣu", [241, 101, 108]]],
    ], "idam (Sūtras 239–243)"),
    f: fixed([
      [["iyam", [239]], ["ime", [238, 144]], ["imāḥ", [238]]],
      [["imām", [238]], ["ime", [238, 144]], ["imāḥ", [238]]],
      [["anayā", [240]], ["ābhyām", [241]], ["ābhiḥ", [241]]],
      [["asyai", [241, 255]], ["ābhyām", [241]], ["ābhyaḥ", [241]]],
      [["asyāḥ", [241, 255]], ["ābhyām", [241]], ["ābhyaḥ", [241]]],
      [["asyāḥ", [241, 255]], ["anayoḥ", [240]], ["āsām", [241, 228]]],
      [["asyām", [241, 255]], ["anayoḥ", [240]], ["āsu", [241]]],
    ], "idam feminine"),
  },
  adas: {
    m: fixed([
      [["asau", [244]], ["amū", [245]], ["amī", [246]]],
      [["amum", [245]], ["amū", [245]], ["amūn", [245]]],
      [["amunā", [245]], ["amūbhyām", [245]], ["amībhiḥ", [246, 242]]],
      [["amuṣmai", [245, 226, 108]], ["amūbhyām", [245]], ["amībhyaḥ", [246]]],
      [["amuṣmāt", [245, 227, 108]], ["amūbhyām", [245]], ["amībhyaḥ", [246]]],
      [["amuṣya", [245, 103, 108]], ["amuyoḥ", [245]], ["amīṣām", [246, 228, 108]]],
      [["amuṣmin", [245, 229, 108]], ["amuyoḥ", [245]], ["amīṣu", [246, 108]]],
    ], "adas (Sūtras 244–246)"),
  },
  yuṣmad: {
    m: fixed([
      [["tvam", [248]], ["yuvām", [248]], ["yūyam", [248]]],
      [["tvām/tvā", [248, 252]], ["yuvām/vām", [248, 253]], ["yuṣmān/vaḥ", [248, 250]]],
      [["tvayā", [248]], ["yuvābhyām", [248]], ["yuṣmābhiḥ", [248]]],
      [["tubhyam/te", [248, 251]], ["yuvābhyām/vām", [248, 253]], ["yuṣmabhyam/vaḥ", [248, 250]]],
      [["tvat", [248]], ["yuvābhyām", [248]], ["yuṣmat", [248]]],
      [["tava/te", [248, 251]], ["yuvayoḥ/vām", [248, 253]], ["yuṣmākam/vaḥ", [248, 250]]],
      [["tvayi", [248]], ["yuvayoḥ", [248]], ["yuṣmāsu", [248]]],
    ], "yuṣmad — the same in every gender (Sūtras 248–253)", "The short forms (tvā, te, vām, vaḥ) come only after another word, never first (Sūtra 249)."),
  },
  asmad: {
    m: fixed([
      [["aham", [248]], ["āvām", [248]], ["vayam", [248]]],
      [["mām/mā", [248, 252]], ["āvām/nau", [248, 253]], ["asmān/naḥ", [248, 250]]],
      [["mayā", [248]], ["āvābhyām", [248]], ["asmābhiḥ", [248]]],
      [["mahyam/me", [248, 251]], ["āvābhyām/nau", [248, 253]], ["asmabhyam/naḥ", [248, 250]]],
      [["mat", [248]], ["āvābhyām", [248]], ["asmat", [248]]],
      [["mama/me", [248, 251]], ["āvayoḥ/nau", [248, 253]], ["asmākam/naḥ", [248, 250]]],
      [["mayi", [248]], ["āvayoḥ", [248]], ["asmāsu", [248]]],
    ], "asmad — the same in every gender (Sūtras 248–253)", "The short forms (mā, me, nau, naḥ) come only after another word, never first (Sūtra 249)."),
  },
  dvi: {
    m: fixed([[["dvau", [238, 48]]], [["dvau", [238, 48]]], [["dvābhyām", [238, 98]]], [["dvābhyām", [238, 98]]], [["dvābhyām", [238, 98]]], [["dvayoḥ", [238, 104, 54]]], [["dvayoḥ", [238, 104, 54]]]], "dvi: dual only (Sūtra 238)"),
    f: fixed([[["dve", [238, 144]]], [["dve", [238, 144]]], [["dvābhyām", [238]]], [["dvābhyām", [238]]], [["dvābhyām", [238]]], [["dvayoḥ", [238, 145]]], [["dvayoḥ", [238, 145]]]], "dvi feminine"),
    n: fixed([[["dve", [238, 144]]], [["dve", [238, 144]]], [["dvābhyām", [238]]], [["dvābhyām", [238]]], [["dvābhyām", [238]]], [["dvayoḥ", [238]]], [["dvayoḥ", [238]]]], "dvi neuter"),
  },
  tri: {
    m: fixed([[["trayaḥ", [119, 54]]], [["trīn", [95]]], [["tribhiḥ", []]], [["tribhyaḥ", []]], [["tribhyaḥ", []]], [["trayāṇām", [125, 105, 111]]], [["triṣu", [108]]]], "tri: plural only (Sūtra 125)"),
    f: fixed([[["tisraḥ", [151, 152]]], [["tisraḥ", [151, 152]]], [["tisṛbhiḥ", [151]]], [["tisṛbhyaḥ", [151]]], [["tisṛbhyaḥ", [151]]], [["tisṛṇām", [151, 105, 107, 111]]], [["tisṛṣu", [151, 108]]]], "tri feminine (Sūtras 151, 152; no lengthening, 107)"),
    n: fixed([[["trīṇi", [158, 159, 163, 111]]], [["trīṇi", [158, 159, 163, 111]]], [["tribhiḥ", []]], [["tribhyaḥ", []]], [["tribhyaḥ", []]], [["trayāṇām", [125, 105, 111]]], [["triṣu", [108]]]], "tri neuter"),
  },
  catur: {
    m: fixed([[["catvāraḥ", [202]]], [["caturaḥ", []]], [["caturbhiḥ", [203]]], [["caturbhyaḥ", [203]]], [["caturbhyaḥ", [203]]], [["caturṇām", [198, 111]]], [["caturṣu", [203, 108]]]], "catur: plural only (Sūtras 202, 198)"),
    f: fixed([[["catasraḥ", [151, 152]]], [["catasraḥ", [151, 152]]], [["catasṛbhiḥ", [151]]], [["catasṛbhyaḥ", [151]]], [["catasṛbhyaḥ", [151]]], [["catasṛṇām", [151, 105, 107, 111]]], [["catasṛṣu", [151, 108]]]], "catur feminine (Sūtras 151, 152)"),
    n: fixed([[["catvāri", [202]]], [["catvāri", [202]]], [["caturbhiḥ", [203]]], [["caturbhyaḥ", [203]]], [["caturbhyaḥ", [203]]], [["caturṇām", [198, 111]]], [["caturṣu", [203, 108]]]], "catur neuter"),
  },
  sakhi: {
    m: fixed([
      [["sakhā", [127]], ["sakhāyau", [130, 128, 54]], ["sakhāyaḥ", [130, 54]]],
      [["sakhāyam", [130, 54]], ["sakhāyau", [130, 54]], ["sakhīn", [95]]],
      [["sakhyā", [131, 50]], ["sakhibhyām", []], ["sakhibhiḥ", []]],
      [["sakhye", [131, 50]], ["sakhibhyām", []], ["sakhibhyaḥ", []]],
      [["sakhyuḥ", [132]], ["sakhibhyām", []], ["sakhibhyaḥ", []]],
      [["sakhyuḥ", [132]], ["sakhyoḥ", [50]], ["sakhīnām", [105, 107]]],
      [["sakhyau", [133]], ["sakhyoḥ", [50]], ["sakhiṣu", [108]]],
      [["sakhe", [119, 110]], ["sakhāyau", [130]], ["sakhāyaḥ", [130]]],
    ], "sakhi (Sūtras 127, 130–133)"),
  },
  pati: {
    m: fixed([
      [["patiḥ", []], ["patī", [116]], ["patayaḥ", [119, 54]]],
      [["patim", [94]], ["patī", [116]], ["patīn", [95]]],
      [["patyā", [131, 50]], ["patibhyām", []], ["patibhiḥ", []]],
      [["patye", [131, 50]], ["patibhyām", []], ["patibhyaḥ", []]],
      [["patyuḥ", [132]], ["patibhyām", []], ["patibhyaḥ", []]],
      [["patyuḥ", [132]], ["patyoḥ", [50]], ["patīnām", [105, 107]]],
      [["patyau", [133]], ["patyoḥ", [50]], ["patiṣu", [108]]],
      [["pate", [119, 110]], ["patī", [116]], ["patayaḥ", [119, 54]]],
    ], "pati, not in a compound (Sūtras 131–133)"),
  },
  go: {
    m: fixed([
      [["gauḥ", [141]], ["gāvau", [141, 55]], ["gāvaḥ", [141, 55]]],
      [["gām", [142]], ["gāvau", [141, 55]], ["gāḥ", [142]]],
      [["gavā", [55]], ["gobhyām", []], ["gobhiḥ", []]],
      [["gave", [55]], ["gobhyām", []], ["gobhyaḥ", []]],
      [["goḥ", [121]], ["gobhyām", []], ["gobhyaḥ", []]],
      [["goḥ", [121]], ["gavoḥ", [55]], ["gavām", [55]]],
      [["gavi", [55]], ["gavoḥ", [55]], ["goṣu", [108]]],
      [["gauḥ", [141]], ["gāvau", [141]], ["gāvaḥ", [141]]],
    ], "go (Sūtras 141, 142)"),
  },
  rai: {
    m: fixed([
      [["rāḥ", [140]], ["rāyau", [54]], ["rāyaḥ", [54]]],
      [["rāyam", [54]], ["rāyau", [54]], ["rāyaḥ", [54]]],
      [["rāyā", [54]], ["rābhyām", [140]], ["rābhiḥ", [140]]],
      [["rāye", [54]], ["rābhyām", [140]], ["rābhyaḥ", [140]]],
      [["rāyaḥ", [54]], ["rābhyām", [140]], ["rābhyaḥ", [140]]],
      [["rāyaḥ", [54]], ["rāyoḥ", [54]], ["rāyām", [54]]],
      [["rāyi", [54]], ["rāyoḥ", [54]], ["rāsu", [140]]],
      [["rāḥ", [140]], ["rāyau", [54]], ["rāyaḥ", [54]]],
    ], "rai (Sūtra 140)"),
  },
  pathin: {
    m: fixed([
      [["panthāḥ", [193, 194]], ["panthānau", [194, 163]], ["panthānaḥ", [194, 163]]],
      [["panthānam", [194, 163]], ["panthānau", [194, 163]], ["pathaḥ", [195]]],
      [["pathā", [195]], ["pathibhyām", [190]], ["pathibhiḥ", [190]]],
      [["pathe", [195]], ["pathibhyām", [190]], ["pathibhyaḥ", [190]]],
      [["pathaḥ", [195]], ["pathibhyām", [190]], ["pathibhyaḥ", [190]]],
      [["pathaḥ", [195]], ["pathoḥ", [195]], ["pathām", [195]]],
      [["pathi", [195]], ["pathoḥ", [195]], ["pathiṣu", [190, 108]]],
      [["panthāḥ", [193, 194]], ["panthānau", [194]], ["panthānaḥ", [194]]],
    ], "pathin (Sūtras 193–195)"),
  },
  puṁs: {
    m: fixed([
      [["pumān", [210, 163, 176]], ["pumāṁsau", [210, 163, 165]], ["pumāṁsaḥ", [210, 163, 165]]],
      [["pumāṁsam", [210, 163, 165]], ["pumāṁsau", [210, 163, 165]], ["puṁsaḥ", []]],
      [["puṁsā", []], ["pumbhyām", [176]], ["pumbhiḥ", [176]]],
      [["puṁse", []], ["pumbhyām", [176]], ["pumbhyaḥ", [176]]],
      [["puṁsaḥ", []], ["pumbhyām", [176]], ["pumbhyaḥ", [176]]],
      [["puṁsaḥ", []], ["puṁsoḥ", []], ["puṁsām", []]],
      [["puṁsi", []], ["puṁsoḥ", []], ["puṁsu", [176]]],
      [["puman", [210, 176]], ["pumāṁsau", [210]], ["pumāṁsaḥ", [210]]],
    ], "puṁs (Sūtra 210)"),
  },
};

// ---------------------------------------------------------------- ṇatva (Sūtra 111)
const NATVA_GAP = /^[aāiīuūṛṝḷeoyvhkgṅpbmṁ]|^(kh|gh|ph|bh|ai|au)/;
/** n → ṇ after r, ṣ, ṛ, ṝ in the same word, with only vowels, h, y, v, k- or p-class between (Sūtra 111). */
export function natva(w: string): { w: string; changed: boolean } {
  let changed = false;
  let out = "";
  let trigger = false;
  for (let i = 0; i < w.length; ) {
    const two = w.slice(i, i + 2);
    const ch = /^(kh|gh|ph|bh|ai|au|ch|jh|ṭh|ḍh|th|dh)/.test(two) ? two : w[i];
    if (/^[rṣṛṝ]$/.test(ch)) trigger = true;
    else if (ch === "n" && trigger && i < w.length - 1 && /[aāiīuūṛṝeonmyv]/.test(w[i + 1] ?? "")) {
      out += "ṇ";
      changed = true;
      trigger = false;
      i += 1;
      continue;
    } else if (!NATVA_GAP.test(ch)) trigger = false;
    out += ch;
    i += ch.length;
  }
  return { w: out, changed };
}

// ---------------------------------------------------------------- choosing the class
export type Guess = { cls: string; gender: "m" | "f" | "n" };
const RELATION = new Set(["pitṛ", "bhrātṛ", "jāmātṛ", "devṛ", "nṛ"]);
const FEM_R = new Set(["mātṛ", "duhitṛ", "yātṛ", "nanāndṛ"]);

/** The usual gender(s) for a stem, by its ending. */
export function gendersFor(stem: string): ("m" | "f" | "n")[] {
  if (WORDS[stem]) return Object.keys(WORDS[stem]) as ("m" | "f" | "n")[];
  if (/ā$/.test(stem) || /[īū]$/.test(stem)) return ["f"];
  if (/as$/.test(stem)) return ["n"];
  if (/(mat|vat)$/.test(stem)) return ["m", "n"];
  if (FEM_R.has(stem) || stem === "svasṛ") return ["f"];
  if (/ṛ$/.test(stem)) return ["m"];
  if (/in$/.test(stem)) return ["m"];
  if (/an$/.test(stem)) return ["m", "n"];
  if (/[iu]$/.test(stem)) return ["m", "f", "n"];
  if (/a$/.test(stem)) return ["m", "n"];
  return ["m", "f"];
}

function classFor(stem: string, g: "m" | "f" | "n"): string | null {
  if (/a$/.test(stem)) return g === "n" ? "a-n" : g === "m" ? "a-m" : null;
  if (/ā$/.test(stem)) return "ā-f";
  if (/i$/.test(stem)) return g === "m" ? "i-m" : g === "f" ? "i-f" : "i-n";
  if (/u$/.test(stem)) return g === "m" ? "u-m" : g === "f" ? "u-f" : "u-n";
  if (/ī$/.test(stem)) return "ī-f";
  if (/ū$/.test(stem)) return "ū-f";
  if (/ṛ$/.test(stem)) return RELATION.has(stem) || FEM_R.has(stem) ? "ṛ-rel" : "ṛ-agent";
  if (/in$/.test(stem)) return g === "m" ? "in-m" : null;
  if (/(mat|vat)$/.test(stem)) return g === "m" ? "vat-m" : null;
  if (/at$/.test(stem)) return g === "m" ? "at-m" : null;
  if (/an$/.test(stem)) return g === "n" ? "an-n" : "an-m";
  if (/as$/.test(stem)) return g === "n" ? "as-n" : null;
  if (/[td]$/.test(stem)) return "t-c";
  if (/c$/.test(stem)) return "c-c";
  return null;
}

/** "rāmaḥ", "harim" … → a likely stem (for people who type a form). */
export function stemFromForm(w: string): string {
  const s = w.trim().toLowerCase().normalize("NFC").replace(/ṃ/g, "ṁ");
  if (WORDS[s]) return s;
  if (/aḥ$/.test(s)) return s.slice(0, -1);
  if (/[iu]ḥ$/.test(s)) return s.slice(0, -1);
  if (/ṛḥ$/.test(s)) return s.slice(0, -1);
  return s;
}

/** The full table of a stem in one gender, or null with the reason. */
export function decline(stem0: string, gender: "m" | "f" | "n"): Table | { error: string } {
  const stem = stem0.trim().toLowerCase().normalize("NFC").replace(/ṃ/g, "ṁ");
  const w = WORDS[stem]?.[gender];
  if (w) {
    const cells = w.rows.map((r) =>
      r.map(([f, s]) => {
        const forms = f.split("/").map((x) => natva(x));
        return { forms: forms.map((x) => x.w), sutras: forms.some((x) => x.changed) && !s.includes(111) ? [...s, 111] : s };
      })
    );
    // vocative = nominative for the words that have one
    if (cells.length === 7 && !["yuṣmad", "asmad", "kim", "tad", "yad", "etad", "idam", "adas", "eka", "dvi", "tri", "catur"].includes(stem)) {
      const voc = [...cells[0]];
      if (/a$/.test(stem) && gender !== "f") voc[0] = { forms: [stem], sutras: [109, 110] };
      if (/a$/.test(stem) && gender === "f") voc[0] = { forms: [`${stem.slice(0, -1)}e`], sutras: [145, 110] };
      cells.push(voc);
    }
    return { stem, gender, cls: stem, label: w.label, cells, note: w.note };
  }
  if (WORDS[stem]) return { error: `“${stem}” is not used in this gender.` };
  let cls = classFor(stem, gender);
  if (stem === "svasṛ") cls = "ṛ-agent";
  if (!cls) return { error: `No ${gender === "m" ? "masculine" : gender === "f" ? "feminine" : "neuter"} declension for a stem ending like “${stem}” yet.` };
  const p = P[cls];
  const base = stem.slice(0, stem.length - p.strip);
  // an-stems: the weak stem before vowels (Sūtra 170): a dropped, except after v/m joined to a consonant
  const vam = /[^aāiīuūṛṝeo][vm]an$/.test(stem);
  const weak = cls.startsWith("an-") ? (vam ? `${base}an` : `${base}n`.replace(/jn$/, "jñ")) : base;
  const cells = p.rows.map((r, ci) =>
    r.map(([tpl, sutras], ni) => {
      const forms: string[] = [];
      let s = [...sutras];
      for (const t of tpl.split("/")) {
        let f = t.replace("~#", weak).replace("~", base);
        if (cls.startsWith("an-") && vam) {
          f = f.replace(/^(.*)annī$/, "$1anī");
          s = s.filter((x) => x !== 175);
        }
        if (cls === "an-m" && /jñ/.test(f) && !s.includes(175)) s.push(175);
        const n = natva(f);
        if (n.changed && !s.includes(111)) s.push(111);
        f = n.w;
        // fem. ṛ: acc. plural ends in -ṝḥ, not -ṝn (Sūtra 95: n only in the masculine)
        if (gender === "f" && ci === 1 && ni === 2) f = f.replace(/ṝ[nṇ]$/, "ṝḥ");
        if (!forms.includes(f)) forms.push(f);
      }
      return { forms, sutras: s };
    })
  );
  // lakṣmī-type: su is kept (Sūtra 154)
  if (cls === "ī-f" && ["avī", "tantrī", "tarī", "lakṣmī", "hrī", "dhī", "śrī"].includes(stem)) cells[0][0] = { forms: [`${stem}ḥ`], sutras: [154, 93] };
  if (gender === "f" && cls.startsWith("ṛ-") && cells[1][2].sutras.includes(95)) cells[1][2].sutras = [95, 93];
  return { stem, gender, cls, label: p.label, cells, note: vam ? "va / ma joined to a consonant before -an: the a is kept (Sūtra 170)." : undefined };
}

export const SPECIAL_WORDS = Object.keys(WORDS);
