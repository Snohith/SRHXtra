import { expect, test } from "@playwright/test";

import { WEB_URL } from "./helpers";

/**
 * Squad page (/squad) and player profiles (/squad/[playerSlug]) — static
 * content, so only the web server on :3000 is required (no API/DB fixtures).
 * Covers the hero facts, roster rendering, role/origin/search filters, URL
 * state, empty states, accessibility wiring, JSON-LD, profile pages
 * (feed-backed and basic), the pager, and small-viewport overflow.
 */

const ALL_PLAYERS = 25;

test.describe("/squad", () => {
  test("renders hero facts, captain feature, and all 25 player cards", async ({
    page,
  }) => {
    await page.goto(`${WEB_URL}/squad`);

    await expect(
      page.getByRole("heading", { level: 1, name: "The 2026 squad" }),
    ).toBeVisible();
    await expect(page.locator(".player-card")).toHaveCount(ALL_PLAYERS);

    // Captain feature card (h2) with the head-coach fact in the hero.
    await expect(
      page.getByRole("heading", { level: 2, name: "Pat Cummins" }),
    ).toBeVisible();
    await expect(page.getByText("Daniel Vettori").first()).toBeVisible();

    // Composition panel + live status line.
    await expect(page.locator(".roster-status [role=status]")).toContainText(
      `${ALL_PLAYERS} players`,
    );
    await expect(page.locator(".comp-seg")).toHaveCount(4);
  });

  test("filters by role and origin, with shareable URL state", async ({
    page,
  }) => {
    await page.goto(`${WEB_URL}/squad`);

    await page.getByRole("button", { name: /^Bowlers/ }).click();
    await expect(page.locator(".player-card")).toHaveCount(11);
    await expect(page.locator(".roster-status [role=status]")).toContainText(
      "Showing 11 of 25 players",
    );
    expect(new URL(page.url()).searchParams.get("role")).toBe("bowlers");

    await page.getByRole("button", { name: /^Overseas/ }).click();
    await expect(page.locator(".player-card")).toHaveCount(4);
    expect(new URL(page.url()).searchParams.get("origin")).toBe("overseas");

    // Both chips stay pressed; other role sections are hidden.
    await expect(
      page.getByRole("button", { name: /^Bowlers/ }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(
      page.getByRole("heading", { name: /All-rounders/ }),
    ).toHaveCount(0);
  });

  test("search narrows the roster and drives the empty state", async ({
    page,
  }) => {
    await page.goto(`${WEB_URL}/squad`);

    await page.getByLabel("Search players").fill("natarajan");
    await expect(page.locator(".player-card")).toHaveCount(1);
    await expect(page.locator(".player-card")).toContainText("T Natarajan");
    await expect(page.locator(".player-card")).toContainText("Trade signing");
    expect(new URL(page.url()).searchParams.get("q")).toBe("natarajan");

    // Jersey-number search works too.
    await page.getByLabel("Search players").fill("#30");
    await expect(page.locator(".player-card")).toHaveCount(1);
    await expect(page.locator(".player-card")).toContainText("Pat Cummins");

    // No match → empty state; clearing restores everything and the URL.
    await page.getByLabel("Search players").fill("zzz nobody");
    await expect(page.locator(".roster-empty")).toContainText(
      "No players match",
    );
    await page
      .locator(".roster-empty")
      .getByRole("button", { name: "Clear filters" })
      .click();
    await expect(page.locator(".player-card")).toHaveCount(ALL_PLAYERS);
    expect(new URL(page.url()).searchParams.toString()).toBe("");
  });

  test("a deep link restores filters after hydration", async ({ page }) => {
    await page.goto(`${WEB_URL}/squad?role=all-rounders&origin=overseas`);

    await expect(
      page.getByRole("button", { name: /^All-rounders/ }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(
      page.getByRole("button", { name: /^Overseas/ }),
    ).toHaveAttribute("aria-pressed", "true");
    // Overseas all-rounders: Kamindu Mendis, Liam Livingstone.
    await expect(page.locator(".player-card")).toHaveCount(2);
    await expect(
      page.locator(".player-card", { hasText: "Kamindu Mendis" }),
    ).toHaveCount(1);

    // Unknown role slugs are dropped, not fatal.
    await page.goto(`${WEB_URL}/squad?role=strikers`);
    await expect(page.locator(".player-card")).toHaveCount(ALL_PLAYERS);
  });

  test("stays free of horizontal overflow at 320px", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 720 });
    await page.goto(`${WEB_URL}/squad`);

    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);

    await page.getByLabel("Search players").fill("cummins");
    await expect(page.locator(".player-card")).toHaveCount(1);
    const overflowWhileFiltered = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflowWhileFiltered).toBeLessThanOrEqual(1);
  });

  test("emits SportsTeam JSON-LD with the full roster", async ({ request }) => {
    const res = await request.get(`${WEB_URL}/squad`);
    expect(res.status()).toBe(200);
    const html = await res.text();

    const match = html.match(
      /<script type="application\/ld\+json">([\s\S]*?)<\/script>/,
    );
    expect(match).not.toBeNull();
    const data = JSON.parse(match![1]) as {
      "@type": string;
      coach: { name: string };
      member: { roleName: string; member: { name: string } };
      athlete: { name: string; nationality: { name: string }; url: string }[];
    };
    expect(data["@type"]).toBe("SportsTeam");
    expect(data.coach.name).toBe("Daniel Vettori");
    expect(data.member.roleName).toBe("Captain");
    expect(data.member.member.name).toBe("Pat Cummins");
    expect(data.athlete).toHaveLength(ALL_PLAYERS);
    expect(data.athlete[0].nationality.name).toBe("India");
    // Every athlete links to their profile page.
    expect(data.athlete[0].url).toContain("/squad/aniket-verma");
  });
});

test.describe("/squad/[playerSlug]", () => {
  test("squad cards and the captain feature link to profile pages", async ({
    page,
  }) => {
    await page.goto(`${WEB_URL}/squad`);

    await expect(page.locator(".captain-card")).toHaveAttribute(
      "href",
      "/squad/pat-cummins",
    );

    const card = page.locator(".player-card", { hasText: "Pat Cummins" });
    await expect(card).toHaveAttribute("href", "/squad/pat-cummins");
    await card.click();

    await expect(page).toHaveURL(`${WEB_URL}/squad/pat-cummins`);
    await expect(
      page.getByRole("heading", { level: 1, name: "Pat Cummins" }),
    ).toBeVisible();
  });

  test("feed-backed profile renders hero, badges, stats, and pager", async ({
    page,
  }) => {
    await page.goto(`${WEB_URL}/squad/abhishek-sharma`);

    await expect(
      page.getByRole("heading", { level: 1, name: "Abhishek Sharma" }),
    ).toBeVisible();
    await expect(page.locator(".crumbs [aria-current=page]")).toHaveText(
      "Abhishek Sharma",
    );

    // Feed badges, country flag, batting hand, and jersey number.
    await expect(page.locator(".p-badge.vice")).toHaveText("Vice Captain");
    await expect(page.locator(".player-hero-meta")).toContainText("India");
    await expect(page.locator(".player-hero-meta")).toContainText("LHB");
    await expect(page.locator(".player-hero-meta")).toContainText("Jersey #4");
    await expect(page.locator(".player-hero-meta .flag")).toHaveCount(1);

    // Social links from the feed (Instagram + X).
    await expect(page.locator(".social-btn")).toHaveCount(2);

    // Career tiles: runs, strike rate, best score, 100s/50s.
    const batting = page.locator(".stat-panel", { hasText: "Batting" });
    await expect(batting).toContainText("Runs");
    await expect(batting).toContainText("1,823");
    await expect(batting).toContainText("162.47");
    await expect(batting).toContainText("141");
    await expect(batting).toContainText("1 / 9");

    // Abhishek's feed snapshot has no bowling figures, so no bowling panel.
    await expect(
      page.locator(".stat-panel", { hasText: "Bowling" }),
    ).toHaveCount(0);
  });

  test("captain profile shows feed bowling stats and pager navigation", async ({
    page,
  }) => {
    await page.goto(`${WEB_URL}/squad/pat-cummins`);

    await expect(page.locator(".p-badge.captain")).toHaveText("Captain");
    await expect(page.locator(".section-head .group-count")).toContainText(
      "67 matches",
    );

    const bowling = page.locator(".stat-panel", { hasText: "Bowling" });
    await expect(bowling).toContainText("Wickets");
    await expect(bowling).toContainText("79");
    await expect(bowling).toContainText("8.96");
    await expect(bowling).toContainText("4/34");

    // Squad-order pager: Pat Cummins (index 14) → next is Amit Kumar.
    const pager = page.locator(".player-pager");
    await expect(
      pager.getByRole("link", { name: /Previous player Shivang Kumar/ }),
    ).toBeVisible();
    await pager.getByRole("link", { name: /Next player/ }).click();
    await expect(page).toHaveURL(`${WEB_URL}/squad/amit-kumar`);
    await expect(
      page.getByRole("heading", { level: 1, name: "Amit Kumar" }),
    ).toBeVisible();
  });

  test("basic profile for a squad member without feed data", async ({
    page,
  }) => {
    await page.goto(`${WEB_URL}/squad/t-natarajan`);

    await expect(
      page.getByRole("heading", { level: 1, name: "T Natarajan" }),
    ).toBeVisible();
    await expect(page.locator(".p-badge.tag")).toHaveText("Trade signing");
    await expect(page.locator(".player-pending")).toContainText(
      "Career stats coming soon",
    );
    await expect(page.locator(".stat-panel")).toHaveCount(0);

    // Last player in squad order: previous link only, no next link.
    await expect(
      page
        .locator(".player-pager")
        .getByRole("link", { name: /Previous player Sakib Hussain/ }),
    ).toBeVisible();
    await expect(
      page.locator(".player-pager").getByRole("link", { name: /Next player/ }),
    ).toHaveCount(0);
  });

  test("profile JSON-LD: Person + breadcrumb list", async ({ request }) => {
    const res = await request.get(`${WEB_URL}/squad/abhishek-sharma`);
    expect(res.status()).toBe(200);
    const html = await res.text();

    const blocks = [
      ...html.matchAll(
        /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g,
      ),
    ].map((m) => JSON.parse(m[1]));

    const person = blocks.find((b) => b["@type"] === "Person");
    expect(person).toBeTruthy();
    expect(person.name).toBe("Abhishek Sharma");
    expect(person.jobTitle).toBe("All-rounder");
    expect(person.memberOf.name).toBe("Sunrisers Hyderabad");
    expect(person.url).toContain("/squad/abhishek-sharma");
    expect(person.sameAs).toHaveLength(2);

    const crumbs = blocks.find((b) => b["@type"] === "BreadcrumbList");
    expect(crumbs).toBeTruthy();
    expect(crumbs.itemListElement).toHaveLength(3);
    expect(crumbs.itemListElement[2].name).toBe("Abhishek Sharma");
  });

  test("unknown player slugs return 404", async ({ request }) => {
    const res = await request.get(`${WEB_URL}/squad/not-a-player`);
    expect(res.status()).toBe(404);
  });

  test("profile pages stay free of horizontal overflow at 320px", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 720 });

    // Feed-backed (portrait hero) and the initials-monogram fallback.
    for (const slug of ["pat-cummins", "rs-ambrish"]) {
      await page.goto(`${WEB_URL}/squad/${slug}`);
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(1);
    }
  });
});
