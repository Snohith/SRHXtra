/**
 * Curated scout notes for every SRH IPL 2026 squad member.
 *
 * Grounding rule: every claim below must trace back to either
 * `content/data/squad.json` (official IPL bios) or
 * `content/data/player-season-stats.json` (the single source of truth
 * for 2026 aggregates). Do not add new numbers here — add them to the
 * JSON sources first.
 */

export interface PlayerInsight {
  /** One-to-two sentence tactical verdict. */
  verdict: string;
  /** Exactly three evidence-backed strengths. */
  strengths: [string, string, string];
}

export const PLAYER_INSIGHTS: Record<string, PlayerInsight> = {
  "travis-head": {
    verdict:
      "SRH's powerplay-defining opener — when Head fires in the first six overs, the opposition's plans rarely survive contact.",
    strengths: [
      "567 runs at a 191.55 strike rate in 2024, the most ever in an IPL season at a 190-plus tempo",
      "Record Head–Abhishek powerplays of 125/0 and 107/0 — the two highest in IPL history",
      "410 runs at a 195 strike rate with 35 sixes in IPL 2026",
    ],
  },
  "abhishek-sharma": {
    verdict:
      "The highest gear in the side — Abhishek's 204.7 strike rate led SRH in 2026 while also offering left-arm spin.",
    strengths: [
      "563 runs at 204.7 in 2026 — SRH's fastest scorer and 38 sixes, also a team high",
      "135* highest score in 2026 with a hundred and four fifties",
      "1,575 runs at 167.37 as opener since 2022 after his move up from the middle order",
    ],
  },
  "ishan-kishan": {
    verdict:
      "Stand-in captain for the season's first phase and SRH's second-highest run-getter — the breakout story of 2026.",
    strengths: [
      "602 runs at 182.4 with six fifties and a 91* best in IPL 2026",
      "Arrived off 317 runs at 193.29 in India's T20 World Cup 2026 triumph",
      "Maiden IPL century (106* vs Rajasthan Royals) after his 2025 move from Mumbai Indians",
    ],
  },
  "heinrich-klaasen": {
    verdict:
      "The most destructive middle-order finisher in the league and SRH's 2026 Player of the Season.",
    strengths: [
      "624 runs in 2026 — the most for SRH — with six fifties at a 160 strike rate",
      "400-plus runs at 170-plus in each of his three SRH seasons, including tons of 104 and 105*",
      "88 sixes between 2023 and 2025 — no SRH batter hit more in that span",
    ],
  },
  "nitish-kumar-reddy": {
    verdict:
      "The seam-bowling all-rounder every Indian side craves — a locked-in first XI pick for balance.",
    strengths: [
      "Maiden Test hundred (114 vs Australia at the MCG) — the highest by a No. 8 or below there",
      "2024 breakout: 303 runs at 142.92 plus the match-winning 2/17 against Delhi",
      "Closed the 2025–26 Syed Mushtaq Ali Trophy with a Player-of-the-Match 45(22) and 2/32",
    ],
  },
  "aniket-verma": {
    verdict:
      "A pure power-hitting find — signed for INR 30 lakh on U23 form and instantly clearing ropes in the IPL.",
    strengths: [
      "74 off 41 balls against Delhi in just his third IPL game, walking in at 25/3",
      "20 sixes across his debut 2025 season",
      "Madhya Pradesh's leading SMAT 2025 six-hitter with 10 maximums",
    ],
  },
  "smaran-ravichandran": {
    verdict:
      "Red-ball pedigree meeting T20 intent — a high-ceiling Karnataka left-hander SRH retained after injury.",
    strengths: [
      "1,534 first-class runs at 73.04 with three double hundreds in 17 games",
      "Match-winning 101 in the Vijay Hazare Trophy 2025 final against Vidarbha",
      "T20 record for Karnataka: average 48.90 at a 162.45 strike rate",
    ],
  },
  "salil-arora": {
    verdict:
      "A third keeping option who bats like a finisher — signed for INR 1.5 crore after torching the SMAT.",
    strengths: [
      "Punjab's top SMAT 2025–26 scorer: 358 runs at a 198.88 strike rate",
      "Unbeaten 125 off 45 balls against champions Jharkhand — nine fours, eleven sixes",
      "Only Ishan Kishan cleared the ropes more often than him that SMAT season",
    ],
  },
  "liam-livingstone": {
    verdict:
      "The INR 13 crore marquee buy — a two-time world No. 1 T20I all-rounder who changes games with bat and both spin types.",
    strengths: [
      "437 runs at 182.08 for Punjab Kings in 2022 after his 42-ball England hundred",
      "Ranked the ICC No. 1 T20I all-rounder twice, in 2021 and 2024",
      "Bowls both off-spin and wrist-spin alongside 360-degree power-hitting",
    ],
  },
  "kamindu-mendis": {
    verdict:
      "The tactical wildcard — a Test-class batter who lets the captain bowl spin from either arm.",
    strengths: [
      "Ambidextrous bowling: switches between right-arm off-spin and left-arm orthodox mid-spell",
      "Reached 1,000 Test runs in 13 innings, matching Don Bradman's pace",
      "Author of one of the great IPL catches — the one-handed diving stunner vs Chennai",
    ],
  },
  "harsh-dubey": {
    verdict:
      "A record-breaking domestic season turned into instant IPL impact — including Virat Kohli's wicket.",
    strengths: [
      "Ranji Trophy record 69 wickets in 2024–25, driving Vidarbha's title win",
      "Five IPL wickets in three games at 19.60 — Kohli, Marsh, Russell and Rinku among them",
      "Maiden T20 fifty for India A plus a 28.5 Ranji batting average in 2025–26",
    ],
  },
  "pat-cummins": {
    verdict:
      "The World Cup-winning captain whose 2026 was cut short by injury — eight games, endless tactical value.",
    strengths: [
      "Led SRH to the 2024 final immediately after winning the WTC and ODI World Cup with Australia",
      "18 wickets in 2024 — his best IPL return — after the INR 20.50 crore marquee signing",
      "3/27 best in 2026 with eight wickets from eight games before the layoff",
    ],
  },
  "harshal-patel": {
    verdict:
      "A two-time Purple Cap winner and the designated death-overs bank, bought for ₹8 crore.",
    strengths: [
      "32 wickets in 2021 — the joint-most in a single IPL edition — with a hat-trick vs Mumbai",
      "Purple Cap again in 2024 with 24 wickets for Punjab",
      "16 wickets for SRH in 2025 built on slower balls and dipping yorkers",
    ],
  },
  "jaydev-unadkat": {
    verdict:
      "The attack's experienced head — 483 first-class wickets of left-arm nous guiding a young pace group.",
    strengths: [
      "2017 peak: 24 wickets at 13.41 with 5/30 and a maiden IPL hat-trick",
      "11 wickets at 15.90 for SRH in 2025 after returning to the franchise",
      "An IPL presence since 2010 with India caps across formats",
    ],
  },
  "eshan-malinga": {
    verdict:
      "SRH's 2026 leading wicket-taker — 21 scalps in a full 15-game season after a breakthrough debut year.",
    strengths: [
      "21 wickets in 2026 — the most for SRH — at 8.87 with a 4/30 best",
      "13 wickets in seven debut-season games at 18.90 after the INR 1.20 crore pick",
      "Fast-tracked from Sri Lanka A to ODI and T20I debuts in 2025",
    ],
  },
  "sakib-hussain": {
    verdict:
      "From Bihar teenage prospect to genuine 2026 contributor — 16 wickets in 11 games.",
    strengths: [
      "16 wickets at 22.90 with an 8.74 economy and 4/21 best in IPL 2026",
      "Maiden five-for of 6/41 for Bihar in the 2025–26 Ranji Trophy",
      "Struck with 4 for 20 in only his second senior T20 at age 17",
    ],
  },
  "zeeshan-ansari": {
    verdict:
      "Wicket-taking wrist-spin with death-overs nerve — retained after a ten-game 2025 season.",
    strengths: [
      "Dream IPL start: three Delhi wickets — Fraser-McGurk, du Plessis and Rahul",
      "Googlies plus the rare ability to bowl at the death as a wrist-spinner",
      "INR 40 lakh 2025 signing who held his spot for ten games",
    ],
  },
  "shivang-kumar": {
    verdict:
      "A rare left-arm wrist-spin stock with a handy bat — early days, striking early returns.",
    strengths: [
      "Personal best 5/45 against Karnataka in the Vijay Hazare Trophy",
      "3/25 against Bihar in the Syed Mushtaq Ali Trophy",
      "List A fifty (67 off 69 vs Jharkhand) giving him an edge over rival spin options",
    ],
  },
  "krains-fuletra": {
    verdict:
      "The rawest X-factor in the squad — a 21-year-old left-arm wrist-spinner fast-tracked by Jaydev Unadkat himself.",
    strengths: [
      "Four wickets in two U23 one-day outings that put him on Saurashtra's radar",
      "Handed a Vijay Hazare Trophy squad spot in 2024–25 on Unadkat's recommendation",
      "Maiden IPL contract at INR 30 lakh in the 2026 auction",
    ],
  },
  "amit-kumar": {
    verdict:
      "Domestic steel for the batting group — 3,500-plus runs of Himachal pedigree with leg-spin in reserve.",
    strengths: [
      "Unbeaten 119 on Ranji Trophy debut in 2011–12, earning Player of the Match",
      "275 runs at 39.28 in Himachal's Vijay Hazare Trophy-winning 2021–22 campaign",
      "Anchors against spin and can bowl leg-breaks when the matchup demands",
    ],
  },
  "praful-hinge": {
    verdict:
      "A red-ball workhorse learning the T20 craft — tidy on debut and surrounded by elite mentors.",
    strengths: [
      "27 first-class wickets at 26.70 in just ten games for Vidarbha",
      "1 for 23 in four overs on his only T20 appearance, opening with Umesh Yadav",
      "INR 30 lakh backup-pace signing for the 2026 campaign",
    ],
  },
  "onkar-tarmale": {
    verdict:
      "Raw Mumbai pace in the high 140s — the development project of the fast-bowling group.",
    strengths: [
      "Consistently operates in the high-140 kph range at just 22",
      "Nine wickets across limited Mumbai opportunities in first-class and List A cricket",
      "A maiden IPL season learning under Cummins, Harshal and Unadkat",
    ],
  },
  "r-s-ambrish": {
    verdict:
      "A U19 World Cup winner parachuted in as a replacement — new-ball control with lower-order batting.",
    strengths: [
      "11 wickets at 20.93 in India's U19 World Cup triumph, including 4 for 29 vs New Zealand",
      "Trusted with the new ball for his control and early strike",
      "Bats at No. 7, giving the side lower-order balance",
    ],
  },
  "dilshan-madushanka": {
    verdict:
      "A World Cup-proven new-ball swinger still awaiting his IPL bow — signed as Brydon Carse's injury replacement.",
    strengths: [
      "21 wickets at the 2023 ODI World Cup, including a five-wicket haul against India",
      "Sharp inswing to the right-hander at genuine pace from the left arm",
      "Sri Lanka representative across all three international formats since 2022",
    ],
  },
  "gerald-coetzee": {
    verdict:
      "The enforcer — high-intensity pace and bounce to unsettle rather than contain, signed for David Payne.",
    strengths: [
      "South Africa's leading wicket-taker at the 2023 ODI World Cup with 20 scalps",
      "13 wickets in ten games on IPL debut for Mumbai Indians in 2024",
      "Thrives on hard lengths and aggressive, attacking spells",
    ],
  },
};

export function getPlayerInsight(slug: string): PlayerInsight | null {
  return PLAYER_INSIGHTS[slug] ?? null;
}
