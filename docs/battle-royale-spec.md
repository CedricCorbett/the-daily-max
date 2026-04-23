# THE CRUCIBLE · Phase 2 Spec

Working name: **The Crucible** (placeholder — avoid "Battle Royale" publicly, brand mismatch).
Ships: **~month 4 after launch.** Data collection begins Day 1.

The endgame. A 5-day season where pre-qualified 2- and 3-person teams pledge
to log every single day. Miss once → your team is cut. Commitment over volume.
Discipline over peak.

---

## 1. Philosophy (non-negotiable)

- **Commitment first.** Showing up is the win. A team where everyone logged beats a team that out-reps them but had one skip.
- **Can't carry.** Scores cap at 100% of personal PR. Titans don't drag Newbies over the line.
- **No cash prizes.** Physical artifacts with patina — numbered oxblood dog tags, steel season coins, leather patches. Unforgeable, brand-consistent, scarcity scales with season number.
- **Zero-tolerance, one mercy.** A single missed day cuts the team, minus one emergency token per team per season.

---

## 2. Pre-Qualification

Every competing member must individually clear these gates before the Shakedown Week opens.

| Gate                  | Requirement                                                     |
| --------------------- | --------------------------------------------------------------- |
| Data runway           | **90 consecutive days** of logged entries                       |
| Consistency floor     | **≤6 missed days** in that 90-day window (93% floor)            |
| Pre-qual video        | One verified set per station within the last 90 days            |
| Video review          | Each video reviewed by **3 community reviewers**                |
| Reviewer earn-rate    | You earn your pre-qual by first reviewing 3 other videos        |

Pre-qual video failure = no entry. Reviewer queue seeds itself from the earn-rate loop; no ops bottleneck.

---

## 3. Team Formation

- **Team size:** 2 or 3. **Brackets are separate** (2v2 only competes against 2-teams, 3v3 only against 3-teams).
- **Two pairing modes, both allowed:**
  - **Cold match** — algorithm pairs strangers within ±3h timezone and same PR tier
  - **Prior-relationship** — manual invite to a mutual (same clan ≥30 days, rally history, or accepted friend request)
- **Coaching pairs** — allowed via prior-relationship only. **Never cold-matched.** Partnership card shows `COACHING PAIR` vs `PEER PAIR` so the community sees the dynamic honestly.
- **Match transparency card** (shown before accepting cold match):
  - 90-day consistency %
  - Current streak
  - Timezone + city
  - Voice style
  - One-line "why I'm here"
- **Timezone-aware matching:** ±3h default, cross-zone pairing only with mutual opt-in.

---

## 4. Shakedown Week

Before the Crucible locks, cold-matched pairs run a 7-day shake test.

- **3–5 joint check-ins** (both log same day) required
- If either member flakes during Shakedown → pair dissolves clean, both return to pool, **no penalty**
- Weeds out flakes before the stakes are real (pool session before open water)

Prior-relationship pairs can opt out of Shakedown but it's recommended regardless.

---

## 5. Scoring

Mean-based, capped, un-carryable.

```
individual_score = min( today_work / personal_PR, 1.0 )
team_score       = mean( individual_scores across team members )
```

- Missed log entry = **0.0** (not excluded from mean)
- Beast at 120% still counts as 1.0 (cap holds)
- No standard-deviation cap — the Beast's coaching of the Newbie is the point, math treats both equally at their own PR ceiling

---

## 6. The Cut

Elimination is immediate on a missed day, except for one mercy.

**Emergency token**
- **One per team, per 5-day season.** Not per person. Not stackable.
- Requires photo/doc proof (hospital bracelet, ER bill, travel emergency)
- Community-reviewed within 24h, 3 reviewers must agree
- Token consumed converts that day's 0.0 to the team's rolling mean (no bonus, no penalty)

**Ghost protocol**
- If a member goes silent 48h + non-ghosting partner(s) have 3 timestamped outreach pings
- Non-ghost may petition to survive without them
- Community review panel decides within 24h
- Prevents one quiet person from being a nuclear button on their teammates

**Final-hour SOS**
- 1h before local deadline, if a member hasn't logged, app fires a **critical alert** to entire team
- Overrides silent mode where platform permits
- Team can physically call/find the missing member

---

## 7. Integrity Systems

Three overlapping filters. No auto-DQ — everything routes to human review.

**Eye of Sauron (randomized audits)**
- During the Crucible, ~10% of sets per member per day require live video
- Skipping the prompt = team cut
- Community flags `GOOD FORM` / `NO REP`

**Anomaly flagging**
- Step-function jump (flat 90 days → +40% week of Crucible) → flag
- Bot-like consistency (identical reps for 180 days) → flag
- Flagged teams move to **high-scrutiny tier**: video audit rate doubles (20%), 3 reviewers per video instead of 1
- Flag alone is never a DQ — just more watching

**Pre-qual video already required (see §2)**

---

## 8. Post-Cut

Survival after elimination. Keeps the habit, protects the individual.

- **Individual data survives the team cut.** 90-day history, PRs, streak — all intact. Losing a partner doesn't nuke the strong player.
- **Purgatory bracket** — cut teams enter a 7-day perfect-attendance loop to re-qualify for next Crucible
- **24h chat cooldown** — immediately after elimination, team chat is read-only. No public blame posting. Prevents the one message that ends the friendship.
- **Mutual divorce** — either member can dissolve a team pre-Crucible with no data penalty. One-button clean exit.
- **Ship-again button** — post-Crucible, surviving pairs can one-tap convert into permanent battle buddies / clan prospects. Community flywheel.

---

## 9. Infrastructure Notes

- **Staggered deadlines** — Crucible day ends at each user's local midnight, not a global midnight. Write load spreads over 24h instead of concentrating in one spike.
- **Running totals, not aggregates** — store `running_total` and `count` on user profile; `mean = running_total / count`. Updated once per day per user. Keeps free-tier cheap.
- **Data collection from Day 1.** Crucible feature hides until month 4, but schema must capture the 90-day pre-qual window from app launch forward. Otherwise first-season anomaly detection has nothing to compare against.

---

## 10. Open Questions (decide before schema lands)

- **Season cadence** — monthly? Quarterly? Two per year with escalating prizes? Affects purgatory loop length.
- **Region definition** — metro? State? Time zone? Country? Impacts cold-match pool depth.
- **Prize manufacturing partner** — who makes the dog tags / coins / patches? Need one locked before first season so fulfillment isn't the bottleneck.
- **Public name** — The Crucible / The Season / The Tour / other. Don't ship "Battle Royale."
- **Coach certification** — do verified coaches get a marker on their profile? Ops cost vs. signal-to-community tradeoff.

---

## 11. Schema Additions (when phase-2 lands)

Rough sketch — not to be pushed until the feature is ready. Lives in a future migration, e.g. `0004_crucible.sql`.

```
crucibles               -- one row per season (starts_at, ends_at, region, bracket_size)
crucible_teams          -- team_id, crucible_id, status (qualifying|live|cut|survived)
crucible_members        -- team_id, user_id, role (peer|coach|client), cold_match (bool)
shakedown_checkins      -- team_id, user_id, day, logged (bool)
pre_qual_videos         -- user_id, station, video_url, status (pending|verified|rejected)
pre_qual_reviews        -- video_id, reviewer_id, verdict
audit_prompts           -- user_id, day, required_video (bool), status (pending|verified|rejected|skipped)
emergency_tokens        -- team_id, used_by, day, proof_url, status
ghost_petitions         -- team_id, ghost_user_id, petitioner_id, outreach_pings (jsonb), verdict
anomaly_flags           -- user_id, kind (step_jump|flat_bot|other), flagged_at, tier
```

---

## 12. What This Is Not

- Not a PR leaderboard. PRs are private goalposts; the Crucible measures commitment to your own ceiling.
- Not a fitness test. It's a discipline covenant with a 5-day teeth-clenched finish.
- Not for everyone. That's the point. 90 days of data + 93% consistency + pre-qual video + a partner who won't ghost = earned entry.
