// The ācāryas' commentaries on the Bhagavad-gītā, one kind (tab) each. The
// keys of Śrīdhara, Viśvanātha and Baladeva are the ones already set up for the
// Gītā in the admin, so the import fills them instead of making new ones.
export const GITA_KINDS: { key: string; name: string; author: string; match: (author: string, work: string) => boolean }[] = [
  { key: "subodhini_commentary", name: "Subodhinī", author: "Śrīdhara Svāmī", match: (a) => /sridhara/.test(a) },
  { key: "gudhartha_dipika_commentary", name: "Gūḍhārtha-dīpikā", author: "Madhusūdana Sarasvatī", match: (a) => /madhusudana/.test(a) },
  { key: "sarartha_varsini_commentary", name: "Sārārtha-varṣiṇī", author: "Śrīla Viśvanātha Cakravartī Ṭhākura", match: (a) => /visvanatha|visvanatha/.test(a) },
  { key: "gita_bhusana_commentary", name: "Gītā-bhūṣaṇa", author: "Śrīla Baladeva Vidyābhūṣaṇa", match: (a) => /baladeva/.test(a) },
  { key: "ramanuja_commentary", name: "Gītā-bhāṣya", author: "Śrī Rāmānujācārya", match: (a) => /ramanuja/.test(a) },
  { key: "madhva_commentary", name: "Gītā-bhāṣya", author: "Śrī Madhvācārya", match: (a) => /madhva/.test(a) },
];
