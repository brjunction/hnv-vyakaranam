// The games of the Practice section. Client-safe (no database).

export type GameId = "rama-ravana" | "lanka-dash" | "sandhi-forge" | "nama-grid" | "rule-sorter" | "case-blitz" | "varna-order" | "sutra-order";

export type GameMeta = {
  id: GameId;
  href: string;
  title: string;
  deva: string;
  /** One line for the hub card. */
  text: string;
  /** What kind of game it is — shown as a small tag. */
  kind: string;
  color: string;
  /** Header intro on the game's own page. */
  intro: string;
  description: string;
};

export const GAMES: GameMeta[] = [
  {
    id: "rama-ravana",
    href: "/practice/games/rama-ravana",
    title: "Rāma–Rāvaṇa battle",
    deva: "राम-रावण युद्धम्",
    kind: "Battle",
    text: "Ten heads, ten right answers. Śrī Rāma’s arrow brings Rāvaṇa down — and every answer shows its sūtra.",
    color: "#b3341a",
    intro: "Ten heads, ten right answers. Study mode shows the sūtra after every answer; Battle mode adds a clock.",
    description: "Answer before Rāvaṇa’s arrow lands — Śrī Rāma’s arrow cuts it down. Easy, medium or hard. Questions from Hari-nāmāmṛta-vyākaraṇa, each with its sūtra.",
  },
  {
    id: "lanka-dash",
    href: "/practice/games/lanka-dash",
    title: "Laṅkā Dash",
    deva: "लङ्का-धावनम्",
    kind: "Runner",
    text: "Run with Śrī Rāma toward Laṅkā and shoot open the right door in every fort gate.",
    color: "#d9622b",
    intro: "Rāma runs, the gates rush at him — shoot the door with the right answer. Study mode waits for you; Run mode does not.",
    description: "Run with Śrī Rāma to Laṅkā and shoot open the right door of each fort gate — a Sanskrit grammar runner with a sūtra for every answer.",
  },
  {
    id: "sandhi-forge",
    href: "/practice/games/sandhi-forge",
    title: "Sandhi Forge",
    deva: "सन्धि-कर्मशाला",
    kind: "Builder",
    text: "No list to choose from — forge the joined word letter by letter, and strike.",
    color: "#c2410c",
    intro: "Two words lie on the anvil. Forge the letters where they meet, tile by tile — you build the sandhi yourself.",
    description: "Build Sanskrit sandhi letter by letter on the anvil — a hands-on Sandhi game with the sūtra behind every join.",
  },
  {
    id: "nama-grid",
    href: "/practice/games/nama-grid",
    title: "Nāma Grid",
    deva: "नाम-कोष्ठकम्",
    kind: "Table",
    text: "Fill a whole declension table — eight cases, three numbers — and see where every form belongs.",
    color: "#a8541e",
    intro: "A noun has eight cases in three numbers. Fill the table from the bank of forms; a wrong form tells you where it really goes.",
    description: "Fill the declension table of Sanskrit nouns — kṛṣṇa, hari, rādhā and more — a Nāma game from the paradigms of Hari-nāmāmṛta-vyākaraṇa.",
  },
  {
    id: "rule-sorter",
    href: "/practice/games/rule-sorter",
    title: "Rule Sorter",
    deva: "सूत्र-वर्गीकरणम्",
    kind: "Sorter",
    text: "Crates ride the belt, each with a worked example. Send it to the bin of the sūtra that makes it so.",
    color: "#1f8a8a",
    intro: "Each crate holds a worked example. Send it to the bin of the sūtra behind it — sorting by rule is the skill that matters.",
    description: "Sort Sanskrit examples by the sūtra that makes them — a rule-recognition game for Hari-nāmāmṛta-vyākaraṇa.",
  },
  {
    id: "case-blitz",
    href: "/practice/games/case-blitz",
    title: "Case Blitz",
    deva: "विभक्ति-वेगः",
    kind: "Arcade",
    text: "A form flashes up. Name its case and number before the clock runs out.",
    color: "#7c3aed",
    intro: "A declined form appears — tap its case and its number. Quick rounds, three lives, and a streak that keeps score.",
    description: "Name the case and number of Sanskrit noun forms against the clock — a fast declension game from the paradigms of Hari-nāmāmṛta-vyākaraṇa.",
  },
  {
    id: "varna-order",
    href: "/practice/games/varna-order",
    title: "Varṇa Order",
    deva: "वर्ण-क्रमः",
    kind: "Order",
    text: "Tap the letters of the varṇa-krama in their order — one row, or the whole alphabet.",
    color: "#0f766e",
    intro: "The varṇa-krama arises from Nārāyaṇa (sūtra 1). Put the letters in their order: a row at a time, or all forty-seven.",
    description: "Put the Sanskrit alphabet in order — vowels, vargas, semivowels and sibilants — a varṇa-krama game for beginners.",
  },
  {
    id: "sutra-order",
    href: "/practice/games/sutra-order",
    title: "Sūtra Order",
    deva: "सूत्र-क्रमः",
    kind: "Order",
    text: "A few neighbouring sūtras lie in a heap. Tap them in the order the text gives them.",
    color: "#9333ea",
    intro: "The sūtras follow each other for a reason. Put a short run of real sūtras back in their order.",
    description: "Arrange real sūtras of Hari-nāmāmṛta-vyākaraṇa in their textual order — a sequence game for memorising the text.",
  },
];

export const gameMeta = (id: GameId) => GAMES.find((g) => g.id === id)!;
