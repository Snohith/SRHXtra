"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import type { User } from "@supabase/supabase-js";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import playerSeasonPoll from "@/content/data/player-season-poll.json";
import squadData from "@/content/data/squad.json";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

interface PollOption {
  id: string;
  player_slug: string | null;
  label: string;
  role: string | null;
  image_url: string | null;
  image_alt: string | null;
  reason: string | null;
  sort_order: number | null;
}

interface PollRecord {
  id: string;
  title: string;
  description: string | null;
  poll_options: PollOption[];
}

type PollStatus = "loading" | "ready" | "voted" | "missing-config" | "error";

interface PlayerSeasonPollProps {
  pollSlug: string;
}

const duplicateVoteCode = "23505";
const legacyOptionSlugFallbacks: Record<string, string> = {
  "sakib-hussain": "pat-cummins",
};

const nomineeStats: Record<string, Array<{ label: string; value: string }>> = {
  "Ishan Kishan": [
    { label: "Matches", value: "15" },
    { label: "Runs", value: "602" },
    { label: "Strike rate", value: "182.4" },
    { label: "Highest score", value: "91*" },
    { label: "Fifties", value: "6" },
  ],
  "Abhishek Sharma": [
    { label: "Matches", value: "15" },
    { label: "Runs", value: "563" },
    { label: "Strike rate", value: "204.7" },
    { label: "Highest score", value: "135*" },
    { label: "100s / 50s", value: "1 / 4" },
  ],
  "Heinrich Klaasen": [
    { label: "Matches", value: "15" },
    { label: "Runs", value: "624" },
    { label: "Strike rate", value: "160.0" },
    { label: "Highest score", value: "69*" },
    { label: "Fifties", value: "6" },
  ],
  "Pat Cummins": [
    { label: "Matches", value: "8" },
    { label: "Wickets", value: "8" },
    { label: "Economy", value: "9.28" },
    { label: "Best spell", value: "3/27" },
    { label: "Runs", value: "30" },
  ],
  "Sakib Hussain": [
    { label: "Matches", value: "11" },
    { label: "Wickets", value: "16" },
    { label: "Average", value: "22.9" },
    { label: "Economy", value: "8.74" },
    { label: "Best spell", value: "4/21" },
  ],
  "Eshan Malinga": [
    { label: "Matches", value: "15" },
    { label: "Wickets", value: "21" },
    { label: "Average", value: "23.0" },
    { label: "Economy", value: "8.87" },
    { label: "Best spell", value: "4/30" },
  ],
};

function buildNomineeOptions(options: PollOption[]) {
  const optionsBySlug = new Map(
    options
      .filter((option) => option.player_slug)
      .map((option) => [option.player_slug as string, option]),
  );

  return playerSeasonPoll.nominees.map((nominee, index) => {
    const player = squadData.players.find((squadPlayer) => squadPlayer.slug === nominee.playerSlug);
    const liveOption = optionsBySlug.get(nominee.playerSlug)
      ?? optionsBySlug.get(legacyOptionSlugFallbacks[nominee.playerSlug] ?? "");

    return {
      id: liveOption?.id ?? `local-${nominee.playerSlug}`,
      player_slug: nominee.playerSlug,
      label: player?.name ?? liveOption?.label ?? nominee.playerSlug,
      role: player?.role ?? liveOption?.role ?? null,
      image_url: player?.image ?? liveOption?.image_url ?? null,
      image_alt: player?.imageAlt ?? liveOption?.image_alt ?? null,
      reason: nominee.reason,
      sort_order: index + 1,
    } satisfies PollOption;
  });
}

export function PlayerSeasonPoll({ pollSlug }: PlayerSeasonPollProps) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [status, setStatus] = useState<PollStatus>("loading");
  const [poll, setPoll] = useState<PollRecord | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [savedOptionId, setSavedOptionId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadPoll() {
      if (!supabase) {
        setStatus("missing-config");
        setMessage("Voting setup is missing deployment environment variables.");
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      let currentUser = sessionData.session?.user ?? null;

      if (!currentUser) {
        const { data: signInData, error: signInError } = await supabase.auth.signInAnonymously();
        if (signInError || !signInData.user) {
          if (!isMounted) return;
          console.error("Supabase anonymous sign-in failed", signInError);
          setStatus("error");
          setMessage("Anonymous voting is not enabled in Supabase yet.");
          return;
        }

        currentUser = signInData.user;
      }

      const { data: pollData, error: pollError } = await supabase
        .from("polls")
        .select("id,title,description,poll_options(id,player_slug,label,role,image_url,image_alt,reason,sort_order)")
        .eq("slug", pollSlug)
        .eq("is_active", true)
        .single();

      if (pollError || !pollData) {
        if (!isMounted) return;
        console.error("Supabase poll load failed", pollError);
        setStatus("error");
        setMessage("Poll details could not be loaded. Check the Supabase SQL setup.");
        return;
      }

      const normalizedPoll = {
        ...pollData,
        poll_options: buildNomineeOptions((pollData.poll_options ?? []) as PollOption[]),
      } as PollRecord;

      const { data: voteData, error: voteError } = await supabase
        .from("poll_votes")
        .select("option_id")
        .eq("poll_id", normalizedPoll.id)
        .eq("voter_id", currentUser.id)
        .maybeSingle();

      if (!isMounted) return;

      setUser(currentUser);
      setPoll(normalizedPoll);

      if (voteError) {
        setStatus("ready");
        setMessage("Pick your nominee.");
        return;
      }

      const existingOptionId = typeof voteData?.option_id === "string" ? voteData.option_id : null;
      setSavedOptionId(existingOptionId);
      setSelectedOptionId(existingOptionId);
      setStatus(existingOptionId ? "voted" : "ready");
      setMessage(existingOptionId ? "This device has already voted." : "Pick your nominee.");
    }

    loadPoll();

    return () => {
      isMounted = false;
    };
  }, [pollSlug, supabase]);

  async function handleVote() {
    if (!supabase || !poll || !user || !selectedOptionId || savedOptionId) {
      return;
    }

    setIsSubmitting(true);
    setMessage("Saving vote...");

    const { error } = await supabase.from("poll_votes").insert({
      poll_id: poll.id,
      option_id: selectedOptionId,
      voter_id: user.id,
    });

    setIsSubmitting(false);

    if (error) {
      if (error.code === duplicateVoteCode) {
        setSavedOptionId(selectedOptionId);
        setStatus("voted");
        setMessage("This device has already voted.");
        return;
      }

      setStatus("error");
      console.error("Supabase vote insert failed", error);
      setMessage("Vote could not be saved. Check Supabase vote permissions.");
      return;
    }

    setSavedOptionId(selectedOptionId);
    setStatus("voted");
    setMessage("Vote recorded.");
  }

  const isLocked = status === "voted" || Boolean(savedOptionId);
  const isUnavailable = status === "missing-config" || status === "error";
  const selectedOption = poll?.poll_options.find((option) => option.id === selectedOptionId) ?? null;

  return (
    <section id="player-season-poll" className="scroll-mt-28">
      <div className="overflow-hidden rounded-[1rem] border border-border bg-surface shadow-[0_30px_80px_rgba(0,0,0,0.06)] sm:rounded-[1.5rem]">
        <div className="relative overflow-hidden bg-[radial-gradient(circle_at_20%_0%,rgba(255,109,0,0.08),transparent_30%),radial-gradient(circle_at_90%_30%,rgba(0,0,0,0.02),transparent_26%),linear-gradient(180deg,#ffffff_0%,#f9fafb_80%)] px-4 py-6 sm:px-8 sm:py-9">
          <div className="absolute inset-0 divider-grid opacity-20" />
          <div className="relative z-10">
            <div className="max-w-3xl">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-accent sm:tracking-[0.3em]">
                {poll?.title ?? "SRH Player of the Season"}
              </p>
              <h2 className="mt-3 text-[clamp(2rem,12vw,3.5rem)] font-black uppercase leading-[0.98] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                Vote for your player of the season
              </h2>
            </div>
          </div>
        </div>

        <div className="border-y border-border bg-black/[0.01] px-4 py-4 sm:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-medium text-muted" aria-live="polite">
              {message || "Loading poll..."}
            </p>
            {selectedOption ? (
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-accent">
                Selected: {selectedOption.label}
              </p>
            ) : null}
          </div>
        </div>

        <div className="px-3 py-5 sm:px-6 sm:py-6 lg:px-8">
          {status === "loading" ? (
            <div className="mx-auto grid max-w-[980px] gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-6">
              {Array.from({ length: 5 }).map((_, index) => (
                <div
                  className={[
                    "h-[360px] animate-pulse rounded-xl border border-border bg-black/[0.02] sm:h-[430px] lg:col-span-2",
                    index === 3 ? "lg:col-start-2" : "",
                  ].join(" ")}
                  key={index}
                />
              ))}
            </div>
          ) : null}

          {isUnavailable ? (
            <div className="rounded-2xl border border-border bg-black/[0.02] p-6 text-sm leading-relaxed text-muted">
              {message}
            </div>
          ) : null}

          {poll ? (
            <>
              <div className="mx-auto grid max-w-[980px] gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-6">
                {poll.poll_options.map((option, index) => {
                const isSelected = selectedOptionId === option.id;
                const isSaved = savedOptionId === option.id;
                const stats = nomineeStats[option.label] ?? [];

                return (
                  <button
                    aria-pressed={isSelected}
                    className={[
                    "group relative flex min-h-[360px] flex-col overflow-hidden rounded-xl border text-left transition-all duration-300 sm:min-h-[430px] lg:col-span-2",
                      isSelected
                        ? "border-accent bg-accent/5 shadow-[0_0_28px_rgba(255,109,0,0.1)]"
                        : "border-border bg-surface hover:-translate-y-1 hover:border-accent/40",
                      isLocked && !isSaved ? "opacity-55" : "opacity-100",
                      index === 3 ? "lg:col-start-2" : "",
                    ].join(" ")}
                    disabled={isLocked || isSubmitting}
                    key={option.id}
                    onClick={() => setSelectedOptionId(option.id)}
                    type="button"
                  >
                    <div className="absolute left-3 top-3 z-20 rounded-full border border-black/10 bg-black/60 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white">
                      Nominee
                    </div>
                    <div className="relative h-[140px] overflow-hidden bg-surface-strong sm:h-[185px]">
                      {option.image_url ? (
                        <Image
                          alt={option.image_alt ?? option.label}
                          className="h-full w-full translate-y-4 scale-[1.28] object-contain object-bottom transition-transform duration-700 group-hover:translate-y-3 group-hover:scale-[1.34] sm:translate-y-6 sm:scale-[1.35] sm:group-hover:scale-[1.42] lg:translate-y-7 lg:scale-[1.65] lg:group-hover:scale-[1.72]"
                          height={360}
                          src={option.image_url}
                          width={420}
                        />
                      ) : null}
                      <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-black/[0.03]" />
                      {isSaved ? (
                        <div className="absolute right-3 top-3 z-20 rounded-full bg-accent px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-black">
                          Voted
                        </div>
                      ) : null}
                    </div>
                    <div className="bg-accent px-3 py-2.5 text-center text-black sm:px-4 sm:py-3">
                      <h3 className="text-base font-black leading-none tracking-tight sm:text-lg">
                        {option.label}
                      </h3>
                      <p className="mt-1 text-xs font-extrabold leading-tight sm:text-sm">
                        {option.role ?? "SRH"}
                      </p>
                    </div>
                    <div className="flex flex-1 flex-col px-3 py-3 sm:px-4 sm:py-4">
                      <div className="space-y-2">
                        {stats.map((stat) => (
                          <div className="flex items-center justify-between gap-4 text-xs font-extrabold sm:text-sm" key={stat.label}>
                            <span className="truncate text-muted">{stat.label}</span>
                            <span className="shrink-0 text-accent">{stat.value}</span>
                          </div>
                        ))}
                      </div>
                      {option.reason ? (
                        <p className="mt-3 line-clamp-2 text-[11px] font-medium leading-relaxed text-muted/70">
                          {option.reason}
                        </p>
                      ) : null}
                      <div className={[
                        "mt-auto flex items-center justify-center rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.14em]",
                        isSaved
                          ? "border-accent bg-accent text-black"
                          : isSelected
                            ? "border-accent text-accent"
                            : "border-border text-muted",
                      ].join(" ")}>
                        {isSaved ? "Voted" : isSelected ? "Selected" : "Select"}
                      </div>
                    </div>
                  </button>
                );
                })}
              </div>

              <div className="mt-5 flex flex-col gap-3 rounded-[1rem] border border-border bg-black/[0.02] p-4 sm:mt-6 sm:flex-row sm:items-center sm:justify-between sm:rounded-[1.25rem]">
                <p className="text-sm text-muted">
                  {isLocked
                    ? "Thanks, you've already voted!"
                    : selectedOptionId
                      ? "Your selected nominee is ready."
                      : "Select a nominee to continue."}
                </p>
                <Button
                  className="w-full sm:w-auto"
                  disabled={!selectedOptionId || isLocked || isSubmitting}
                  onClick={handleVote}
                  size="lg"
                  variant={isLocked ? "secondary" : "primary"}
                >
                  {isSubmitting ? "Saving..." : isLocked ? "Vote saved" : "Vote now"}
                </Button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}
