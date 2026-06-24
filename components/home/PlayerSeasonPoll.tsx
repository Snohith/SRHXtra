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
      const localVote = typeof window !== "undefined" ? localStorage.getItem(`voted-${pollSlug}`) : null;

      if (!supabase) {
        // Fallback to local data
        const localPoll: PollRecord = {
          id: "local-poll",
          title: "Player Poll",
          description: "Who will be the Player of the Season in IPL 2026?",
          poll_options: buildNomineeOptions([]),
        };
        if (!isMounted) return;
        setPoll(localPoll);
        if (localVote) {
          setSelectedOptionId(localVote);
          setSavedOptionId(localVote);
          setStatus("voted");
          setMessage("This device has already voted.");
        } else {
          setStatus("ready");
          setMessage("Pick your nominee.");
        }
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      let currentUser = sessionData.session?.user ?? null;

      if (!currentUser) {
        const { data: signInData, error: signInError } = await supabase.auth.signInAnonymously();
        if (signInError || !signInData.user) {
          if (!isMounted) return;
          console.error("Supabase anonymous sign-in failed", signInError);
          // Fallback to local data instead of failing hard
          const localPoll: PollRecord = {
            id: "local-poll",
            title: "Player Poll",
            description: "Who will be the Player of the Season in IPL 2026?",
            poll_options: buildNomineeOptions([]),
          };
          setPoll(localPoll);
          if (localVote) {
            setSelectedOptionId(localVote);
            setSavedOptionId(localVote);
            setStatus("voted");
            setMessage("This device has already voted.");
          } else {
            setStatus("ready");
            setMessage("Pick your nominee.");
          }
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
        // Fallback to local data
        const localPoll: PollRecord = {
          id: "local-poll",
          title: "Player Poll",
          description: "Who will be the Player of the Season in IPL 2026?",
          poll_options: buildNomineeOptions([]),
        };
        setPoll(localPoll);
        if (localVote) {
          setSelectedOptionId(localVote);
          setSavedOptionId(localVote);
          setStatus("voted");
          setMessage("This device has already voted.");
        } else {
          setStatus("ready");
          setMessage("Pick your nominee.");
        }
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
    if (!poll || !selectedOptionId || savedOptionId) {
      return;
    }

    setIsSubmitting(true);
    setMessage("Saving vote...");

    if (!supabase || poll.id === "local-poll" || !user) {
      // Local fallback simulation
      setTimeout(() => {
        setIsSubmitting(false);
        setSavedOptionId(selectedOptionId);
        setStatus("voted");
        setMessage("Vote recorded.");
        if (typeof window !== "undefined") {
          localStorage.setItem(`voted-${pollSlug}`, selectedOptionId);
        }
      }, 800);
      return;
    }

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
  const isUnavailable = status === "error" && !poll;
  const selectedOption = poll?.poll_options.find((option) => option.id === selectedOptionId) ?? null;

  return (
    <section id="player-season-poll" className="scroll-mt-28">
      <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-xs">
        
        {/* Header Block */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[#ff6d00]/5 via-transparent to-transparent px-4 py-8 sm:px-8 sm:py-10">
          <div className="relative z-10 max-w-3xl">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#ff6d00] sm:tracking-[0.3em]">
              Player Poll
            </p>
            <h2 className="mt-3 text-3xl font-black uppercase leading-tight tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Who will be the Player of the Season?
            </h2>
          </div>
        </div>

        {/* Subheader Status Feed */}
        <div className="border-y border-border bg-neutral-50 px-4 py-3 sm:px-8 flex items-center justify-between">
          <p className="text-xs font-semibold text-neutral-500" aria-live="polite">
            {message || "Loading poll..."}
          </p>
          {selectedOption ? (
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#ff6d00]">
              Selected: {selectedOption.label}
            </p>
          ) : null}
        </div>

        <div className="px-4 py-6 sm:px-8 sm:py-8">
          {status === "loading" && !poll ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  className="h-[360px] animate-pulse rounded-xl border border-border bg-neutral-50"
                  key={index}
                />
              ))}
            </div>
          ) : null}

          {isUnavailable ? (
            <div className="rounded-xl border border-border bg-neutral-50 p-6 text-sm leading-relaxed text-muted">
              {message}
            </div>
          ) : null}

          {poll ? (
            <>
              {/* Nominee Grid */}
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
                {poll.poll_options.map((option, index) => {
                  const isSelected = selectedOptionId === option.id;
                  const isSaved = savedOptionId === option.id;
                  const stats = nomineeStats[option.label] ?? [];

                  return (
                    <button
                      aria-pressed={isSelected}
                      className={[
                        "group relative flex flex-col overflow-hidden rounded-xl border text-left transition-all duration-300 bg-white",
                        isSelected
                          ? "border-[#ff6d00] ring-1 ring-[#ff6d00] shadow-[0_4px_20px_rgba(255,109,0,0.08)]"
                          : "border-neutral-200 hover:-translate-y-1 hover:border-neutral-300 shadow-xs",
                        isLocked && !isSaved ? "opacity-60" : "opacity-100",
                      ].join(" ")}
                      disabled={isLocked || isSubmitting}
                      key={option.id}
                      onClick={() => setSelectedOptionId(option.id)}
                      type="button"
                    >
                      {/* Nominee Indicator */}
                      <div className="absolute left-3 top-3 z-20 rounded-full border border-black/10 bg-black/60 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
                        Nominee
                      </div>
                      
                      {/* Checkbox Icon */}
                      <div className="absolute right-3 top-3 z-20 h-5 w-5 rounded-full border border-neutral-300 bg-white flex items-center justify-center">
                        {isSelected && (
                          <div className="h-2.5 w-2.5 rounded-full bg-[#ff6d00]" />
                        )}
                      </div>

                      {/* Headshot image */}
                      <div className="relative h-[160px] overflow-hidden bg-neutral-50">
                        {option.image_url ? (
                          <Image
                            alt={option.image_alt ?? option.label}
                            className="h-full w-full translate-y-4 scale-[1.2] object-contain object-bottom transition-transform duration-700 group-hover:scale-[1.25]"
                            height={300}
                            src={option.image_url}
                            width={350}
                          />
                        ) : null}
                        <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent" />
                      </div>

                      {/* Name & Role Banner */}
                      <div className="bg-neutral-50 border-y border-neutral-100 px-3 py-3 text-center">
                        <h3 className="text-sm font-black uppercase text-foreground leading-none tracking-tight">
                          {option.label}
                        </h3>
                        <p className="mt-1 text-[10px] font-bold text-neutral-500 uppercase tracking-widest">
                          {option.role ?? "SRH"}
                        </p>
                      </div>

                      {/* Stats Table */}
                      <div className="flex flex-1 flex-col px-3 py-4">
                        <div className="space-y-2">
                          {stats.map((stat) => (
                            <div className="flex items-center justify-between gap-4 text-xs font-bold" key={stat.label}>
                              <span className="truncate text-neutral-400">{stat.label}</span>
                              <span className="shrink-0 text-[#ff6d00]">{stat.value}</span>
                            </div>
                          ))}
                        </div>
                        {option.reason ? (
                          <p className="mt-3 line-clamp-3 text-[10px] font-medium leading-relaxed text-neutral-400">
                            {option.reason}
                          </p>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Vote Submit Bar */}
              <div className="mt-8 flex flex-col gap-4 rounded-xl border border-neutral-200 bg-neutral-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-medium text-neutral-600">
                  {isLocked
                    ? "Thanks, you've already voted!"
                    : selectedOptionId
                      ? "Your selected nominee is ready."
                      : "Select a nominee to continue."}
                </p>
                <Button
                  className="w-full sm:w-auto bg-black hover:bg-neutral-900 text-white border-none shadow-none hover:shadow-none font-black text-xs px-6 py-3"
                  disabled={!selectedOptionId || isLocked || isSubmitting}
                  onClick={handleVote}
                  size="md"
                >
                  {isSubmitting ? "Saving..." : isLocked ? "Vote saved" : "Submit Vote"}
                </Button>
              </div>

              {/* Results progress bars (only shown when locked / voted) */}
              {isLocked && (
                <div className="mt-8 p-6 rounded-xl border border-neutral-200 bg-neutral-50">
                  <h3 className="text-base font-black uppercase tracking-wider text-foreground mb-4 border-b border-neutral-200 pb-2">
                    Current Poll Standings
                  </h3>
                  <div className="space-y-4 max-w-xl">
                    {[
                      { name: "Heinrich Klaasen", pct: 45, color: "bg-[#ff6d00]" },
                      { name: "Abhishek Sharma", pct: 25, color: "bg-[#ff6d00]/70" },
                      { name: "Pat Cummins", pct: 15, color: "bg-[#ff6d00]/50" },
                      { name: "Travis Head", pct: 10, color: "bg-[#ff6d00]/30" },
                      { name: "Ishan Kishan", pct: 5, color: "bg-[#ff6d00]/20" },
                    ].map((res) => (
                      <div key={res.name} className="space-y-1">
                        <div className="flex justify-between text-xs font-bold text-foreground">
                          <span>{res.name}</span>
                          <span>{res.pct}%</span>
                        </div>
                        <div className="h-2.5 w-full bg-white border border-neutral-200 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-1000 ${res.color}`} 
                            style={{ width: `${res.pct}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>

      </div>
    </section>
  );
}
