# Foul Play FC · feature catalog

Proposals for making multiplayer more fun, for review. Nothing here is built yet except where marked **Built**.
Each item lists what it does, how it would work in the current code, and a rough size:

- **Size:** S = an afternoon · M = a day or two · L = several days
- **Fun:** ★ nice · ★★ noticeable · ★★★ changes how matches feel

Numbers use the game's own units: the 5v5 pitch is 2000 × 1240 (about 18 units per metre), walking speed is 155 units/s,
a match second is one real second at Turbo pace. "Charge", "karma", "referee opinion" and "crowd meter" are the existing systems.

Contents

1. [Quick wins for multiplayer](#1-quick-wins-for-multiplayer)
2. [Air-ball indicator](#2-air-ball-indicator) (**Built**)
3. [Character creator and skins](#3-character-creator-and-skins), including how skins reach everyone before kickoff
4. [Power-ups](#4-power-ups)
5. [Big-moment animations](#5-big-moment-animations): fouls, power shots, saves, goals
6. [Taunts](#6-taunts)
7. [Audience opinion meter](#7-audience-opinion-meter): categories, team tug-of-war, chants and banners
8. [Player roles and abilities](#8-player-roles-and-abilities): goalkeeper, defender, midfielder, striker, captain, backseat ([8.1 The Backseat](#81-the-backseat-the-player-who-wont-stop-talking))
9. [Ability catalog](#9-ability-catalog)
10. [Network messages](#10-network-messages)
11. [Suggested order](#11-suggested-order)
12. [Open questions](#12-open-questions)

---

## 1. Quick wins for multiplayer

| # | Feature | What players get | How | Size | Fun |
|---|---|---|---|---|---|
| 1 | **Ready-up and team pick in the lobby** | Everyone confirms before kickoff; host can't start by accident | `ready` flag per roster entry; Start enabled when all humans are ready (host can override) | S | ★★ |
| 2 | **Rematch vote** | One click to play again with the same teams, sides swapped | Full-time screen shows "Rematch" for everyone; host starts when most humans vote | S | ★★ |
| 3 | **Replay of the last goal** | 5-second replay after each goal | Host keeps a ring buffer of the last 6 s of snapshots (already built every 50 ms); replay = draw them back at half speed | M | ★★★ |
| 4 | **Grudge tracker** | "Vargas has fouled you 3 times" shown on your panel; revenge foul gives bonus crowd points | Count fouls per (attacker, victim) pair from existing `fouledReceived` events | S | ★★ |
| 5 | **Golden goal and sudden-death penalties** | Draws end with drama instead of a whimper | When the clock hits 0 at a draw: 60 s golden goal, then alternating penalties using the existing set-piece hold | M | ★★★ |
| 6 | **Bounties** | Crowd puts a bounty on the most popular or the dirtiest player; whoever tackles or scores past them collects | Every 45 s pick a target from popularity or karma; reward = crowd gift | S | ★★ |
| 7 | **Spectator seats** | Players beyond 10 can watch and throw crowd gifts or chants | Already have "watching" roster entries; give them a chant/gift budget (see Backseat role, §8) | M | ★★ |
| 8 | **Mutators for casual rooms** | Host toggles: Big-head mode, Banana rain, No referee, Low gravity, Super sprint | Settings flags read by update(); sent in the roster `meta` so clients show them | S–M | ★★★ |
| 9 | **Post-match awards** | Funny titles on the full-time screen: "Most sneaky", "Crowd's darling", "Banana victim" | Already in the metrics; pick the top player per stat | S | ★★ |
| 10 | **Emote wheel + taunts** | Quick reactions without typing | §6 | M | ★★★ |

## 2. Air-ball indicator

**Built.** While the ball is in the air:

- a white ring on the ground directly under the ball, shrinking as the ball drops (radius = 7 + height × 0.18, max 47),
- a dashed guide line from the ring up to the ball,
- a pulsing gold crosshair where the ball will land.

The landing spot comes from the game's own physics (gravity 900 units/s², air drag e^(−0.15 t)):
`t = (vz + √(vz² + 1800·z)) / 900`, drift `= (1 − e^(−0.15t)) / 0.15`, landing `= position + velocity × drift`.
In testing it matched the real landing within about 4 units. It shows in 3D and Classic, and online players get the ball's
velocity in each snapshot so they see the same marker.

Possible follow-ups: colour the crosshair by which team's player will reach it first (S); hide it for the goalkeeper's
team on shots to keep saves skill-based (S).

## 3. Character creator and skins

### What players can customise

| Part | Options | Notes |
|---|---|---|
| Body | Skin tone (8), height (−6% … +6%), build (slim / regular / stocky) | Height and build are cosmetic only: hitboxes stay the same so nobody gains an edge |
| Head | Hair style (8: buzz, crop, curls, bun, mohawk, long, bald, afro), hair colour (10), facial hair (4) | Built from simple shapes like the current head and hair |
| Kit | **Trim colour**, sleeve style, sock pattern (plain / hoops / stripes), boot colour (8) | The **team colour stays the base of the shirt** so teams are always readable; the skin only adds a trim |
| Number and name | Shirt number 1–99, short name on the back (from the player's lobby name) | Name already exists; number replaces the default |
| Accessories | Headband, wristbands, captain armband (captain only), sunglasses, mask | One accessory slot plus the armband |
| Celebration | 1 of 6 goal celebrations (§5) | Plays after you score |
| Trail | Sprint trail colour (6) | Only visible while sprinting with charge |

A **character creator** screen next to Pace and controls: a turntable 3D preview (the existing rig on a plinth), tabs for
Body / Head / Kit / Extras, a Randomise button, and "Save skin". It works the same in Classic, which draws the trim,
hair and accessories with the existing 2D figure.

### Skin data

Small and preset-only, so nothing a player sends can be offensive, huge or unsafe. No free text and no uploads.

```json
{
  "v": 1,
  "skinTone": 3, "height": 0, "build": 1,
  "hair": 4, "hairColour": 7, "facial": 0,
  "trim": 2, "sleeves": 1, "socks": 2, "boots": 5,
  "number": 27, "accessory": 3,
  "celebration": 2, "trail": 4
}
```

Every field is a small integer index into a preset list (number 1–99). About 200 bytes as JSON. Stored in this
browser's localStorage as `fpfc-skin`, so it persists and loads first, the same way key bindings do.

### Sharing skins before kickoff (the "DB state")

The host's browser already holds the room's shared state: the roster. Skins become part of each roster entry:

1. **Join:** the guest sends its skin with its name in the existing `hello` message:
   `{ t: 'hello', name, skin }`.
2. **Validate on the host:** clamp every field to its preset range, drop unknown fields, and force a unique shirt number per
   team (bump to the next free number on clashes). The host is the single source of truth.
3. **Share:** the host stores it in `roster[uid].skin` and broadcasts the roster as it already does (`{ t: 'roster', … }`),
   so everyone in the lobby has every skin before the match starts, and late joiners get it the moment they arrive.
4. **Lobby preview:** each roster line shows a small head-and-shirt icon from the skin; the host lobby can show a 3D
   line-up of everyone before kickoff.
5. **Changing your skin in the lobby:** send `{ t: 'skin', skin }`; the host validates and re-broadcasts the roster. Locked
   once the match starts (Start sets `meta.status = 'playing'`, as now).
6. **In the match:** when the host assigns a human to a player (`syncHumans`), that player takes the human's skin. Snapshots
   don't need to carry skins every 50 ms: clients look the skin up from the roster by the player's human id, which they already receive.
7. **Bots** use their team's default look with a random skin tone and hair, as now.

Optional later: a **skin code**, a short base-36 string of the 6–14 indices (e.g. `K3F9-2QXA`), so friends can copy
each other's looks. Same validation path.

Size: creator screen M, network sharing S, 3D/2D drawing of options M. Fun ★★★ (people love being recognisable).

## 4. Power-ups

Power-ups would join the existing crowd gifts (med kit, bat, flash powder, bananas), keeping the rule that gifts come
from the crowd and anyone can grab them after a moment. Each has a clear counter so they stay fun for both sides.

| Power-up | Effect | Duration / uses | Counterplay | Size |
|---|---|---|---|---|
| **Rocket boots** | Next 3 shots +35% speed, ball leaves a fire trail | 3 shots | Keepers dive earlier (bigger dive reach while it's active) | S |
| **Magnet boots** | Ball sticks better: tackles against you succeed 50% less often | 8 s | Fouls still knock the ball loose | S |
| **Smoke bomb** | Drops a cloud (radius 90) that hides everyone inside from the referee | 6 s | The referee walks toward smoke; anyone seen leaving it right after a foul still gets caught | M |
| **Whistle** | Fake whistle: every opponent within 200 stops for 0.8 s | 1 use | Counts as unsporting: −10 karma, and the crowd boos if seen | S |
| **Glue puddle** | Like a banana, but slows to 40% for 2 s instead of a slip | 2 drops | Visible on the ground; jump over it with sprint | S |
| **Mega ball** | The ball grows 2× for 10 s (easier to hit, harder to save) | 10 s | Affects both teams equally | S |
| **Shield** | Next foul against you is blocked ("IMMUNE") and the attacker is stunned instead | 1 hit | Lasts until used or 20 s | S |
| **Decoy** | Spawns a fake copy of you that runs forward; bots and the referee may follow it | 5 s | A foul on the decoy pops it | M |
| **Crowd megaphone** | Doubles your crowd-meter gains | 15 s | — | S |
| **Instant replay** | The referee re-checks the last unseen foul by the other team (50% chance to call it) | 1 use | Only works within 4 s of the foul | M |

Spawn rules: weighted by score difference (the losing team's players are more likely to receive the strong ones), at
most 2 on the pitch at once, and mutators (§1) can turn them off for "pure" matches.

## 5. Big-moment animations

Every big moment gets three layers: a **body animation** on the 3D rig (the classic view uses a simpler pose), a **camera
beat**, and a **sound and crowd** response. Each beat is short (≤ 1.2 s) so it never stalls play, and they're skippable.

| Moment | Body animation | Camera | Sound and crowd | Extras |
|---|---|---|---|---|
| **Normal foul** | Attacker shoulder-barge lunge; victim spins and falls | Small shake (exists) | Thud + "OOOH!" (exists) | Dust puff where they land |
| **Bat foul** | Two-handed swing with a wind-up, victim launched a little higher | 0.25 s slow-motion (time × 0.3) | Crack + bigger roar | Cartoon "BONK" star burst |
| **Knockout** | Victim spins twice and flops; little birds circle (3D) | Brief zoom (FOV −4°) | Bell "ding", crowd gasps | KO stamp on the victim's tag |
| **Caught foul** | Referee sprints in, card held high (exists), offender drops to their knees pleading | Cut to the referee for 0.6 s | Whistle (exists) + boos | Card flies to the camera then flips |
| **Sand throw** | Underarm flick; referee rubs eyes and staggers (exists) | — | "Pfft" + crowd laugh | Sand cloud that drifts |
| **Power shot** | Wind-up with the leg drawn far back, ball leaves a coloured trail (sprint-trail colour) | Camera pushes in 3% for 0.3 s | Charged whoosh + "WHAT A STRIKE!" (exists) | Ball streak rendering |
| **Keeper save** | Full-stretch dive (exists), plus catch-and-hug if held | Slow-motion 0.4 s at the moment of contact | Glove slap + applause | "SAVE!" (exists) |
| **Goal** | Scorer's chosen celebration (below); team-mates run to the scorer | Orbit around the scorer for 1.5 s | Goal horn + net ripple + roar | Confetti in the scoring team's colour, net bulge |
| **Own goal** | Scorer facepalms, team-mates shake heads | Slow push toward the culprit | Crowd laughter | "OWN GOAL" in comic font |

**Goal celebrations** (chosen in the character creator): knee slide, aeroplane arms, backflip, robot dance, shush the
crowd (gives the opposing crowd a boo), and "cup to ear" (doubles your crowd-meter bonus for the goal if your team is behind).

Implementation: the rig already has jointed arms and legs; add a small keyframe player (pose name → per-limb rotations over
time) in `js/render3d.js`, triggered by events the host already broadcasts (feed, chants, set pieces). Size M for the
player plus S per animation. Fun ★★★.

## 6. Taunts

Keep taunts **preset-only** (no free chat), so they stay friendly enough for public rooms and work across languages.

**Quick-taunt wheel.** Hold a Taunt key (default `T` for P1 needs moving: suggest `Z`, and `Backslash` for P2) and flick
a direction:

| Direction | Text bubble | Animation |
|---|---|---|
| Up | "Too easy!" | Shrug |
| Right | "Nice try!" | Point and laugh |
| Down | "Sorry!" | Hands up apology (+2 karma if within 3 s of fouling someone) |
| Left | "Ref! REF!" | Waves at the referee (the referee looks over) |
| Up-right | "Come at me" | Chest beat |
| Down-left | "GG" | Thumbs up (+1 karma, once per match) |

Rules:

- 3 s cooldown per player, max 6 per minute; anyone can mute a player for themselves.
- Taunting has small, fun consequences: a taunted opponent's next tackle on you is 20% more likely to succeed ("got them
  fired up"); taunting right after scoring adds to the crowd's **Fun** opinion (§7); "Ref! REF!" makes the referee look
  toward you for 1 s, which can be used to pull their eyes off a team-mate's foul.
- Bots taunt too (rarely), using their karma: dirty bots taunt more.

Network: `{ t: 'taunt', id }` from a player; the host checks the cooldown and broadcasts it in the snapshot's text list,
which is already how floating text reaches everyone.

## 7. Audience opinion meter

Today the crowd has one "excite" level and per-player popularity. This proposal makes the crowd **opinionated**: several
opinion categories per team, which together push a **tug-of-war meter** toward the team the crowd loves.

### Opinion categories

| Category | Goes up when | Goes down when |
|---|---|---|
| **Fun** | Skill moves, long-range power shots, taunts after goals, banana slips, mega-ball chaos | Long spells of passing at the back |
| **Performance** | Goals, saves, completed passes, tackles, possession | Misses from close range, own goals |
| **Noobie-ness** (they're laughing *at* you) | Own goals, slipping on your own banana, missed open goals, fouling your own team-mates | Fades over time; a goal resets it |
| **Sympathy** | Your team is fouled a lot, loses players to red cards, is two or more goals behind | Your team scores or retaliates |
| **Villainy** (they love to hate you) | Unseen fouls, sand, bat hits, waved-off fouls | Help-ups, clean streaks |
| **Drama** | Late goals, comebacks, penalties, saves in the last 20 s, red cards | Quiet minutes |

Each category is a number from 0 to 100 per team, nudged by the same events the match metrics already record (fouls,
unseen fouls, help-ups, saves, shots, goals…), and slowly decays toward 0 so the crowd's mood follows recent play.

### The meter

Each team's **crowd support** = Fun × 0.25 + Performance × 0.3 + Sympathy × 0.2 + Villainy × 0.1 + Drama × 0.15 − Noobie × 0.15.
The **tug-of-war bar** under the scoreboard shows the split (for example HOUNDS 64% · VIPERS 36%) and slides smoothly.
Hovering or a key press shows the six category bars for each team.

What the meter changes:

| Effect | Rule |
|---|---|
| Crowd gifts | The favoured team gets 60–70% of gifts (instead of whoever fills their own meter), so a struggling but entertaining team gets help |
| Sound | The crowd noise pans toward the favoured team's goal end |
| Stands | Fans in that team's colour stand up and wave more; the 3D crowd already bounces with excitement |
| Pressure | When one team has 75%+ support, the other team's shots get +10% spread (home-crowd pressure) for 15 s |

### Chants, taunts and banners from the crowd

The dominant category picks what the crowd does. Chants are the existing bubbles in the stands; **banners** are new:
a cloth strip unrolled across a section of the 3D stand (a textured plane), or a ribbon along the top in Classic.

| Dominant category | Crowd chant (bubble + sound) | Banner examples |
|---|---|---|
| Fun | "OLÉ!", "DO IT AGAIN!" | "WE CAME FOR THE CHAOS", "BANANA SEASON" |
| Performance | "CLASS!", "WORLD CLASS!" | "<TEAM> = FOOTBALL", "<NAME> FOR CAPTAIN" |
| Noobie-ness | "WHO ARE YA?", "MY NAN COULD SCORE THAT" | "SUNDAY LEAGUE", "<NAME> FOUND THE BALL" |
| Sympathy | "KEEP GOING!", "HEADS UP!" | "WE BELIEVE", "NEVER GIVE UP <TEAM>" |
| Villainy | "BOOO!", "CHEAT! CHEAT!" | "REF NEEDS GLASSES", "<NAME>: WANTED" |
| Drama | "HERE WE GO!", "OH MY DAYS!" | "LAST MINUTE MAGIC", "HEART ATTACK FC" |

Rules: one new banner at most every 20 s, names are only ever player names from the roster (already length-limited and
escaped), and banners live for 12 s. All text comes from preset templates, so nothing offensive can appear.

### Data and networking

The host keeps `S.crowd = { opinion: [{fun, perf, noob, symp, vill, drama}, {…}], support: [0.5, 0.5], banners: [] }`,
updates it in `update()` from the same hooks that record metrics, and adds `cr: [support0, top category per team, banners]`
to the snapshot (tiny). It also goes into the match report and metrics files.

Size: L overall (M for the model and meter, M for banners and chants). Fun ★★★.

## 8. Classes (in the game, v1.0)

Twelve classes in four roles, from the class catalog art. Every player has one; bots use the line-ups below and people pick theirs in **Classes & skills**, **Pace and controls → Game**, or the online lobby. Skills are on `U I O` and the ultimate on `P`, aimed along the player's (smoothed) movement direction. The ultimate charges over time and with good play. Skills that hit players (Heavy Punch, Grab & Throw, Bull Rush, Dash Burst, Quake Tackle, Ground Slam, Blink Strike on someone without the ball) count as fouls if the referee sees them.

### Offense · Goal scorers, high damage, break formations

#### Striker · The Finisher (#10)

- **Passive · Goal Instinct:** +20% shot power and +10% speed in the opponent's third of the pitch.
- **1 · Power Shot** (8 s): Your next shot within 4 s flies 40% faster and knocks down anyone in its path.
- **2 · Curve Drive** (10 s): Your next shot within 4 s bends hard in mid-air, making it harder to block or save.
- **3 · Aerial Strike** (12 s): Leap toward the aim and volley anything in reach; landing stuns nearby enemies for 2 s.
- **Ultimate · Meteor Volley:** Meteors rain on the target goal area for 5 s, stunning every enemy there except the keeper, and your next shot can't be caught.

#### Assassin · The Shadow Scorer (#7)

- **Passive · Shadow Step:** Gain +15% speed and stealth for 1.5 s after a successful foul or knockout. The referee can't see you in stealth.
- **1 · Cloak** (14 s): Turn invisible to the referee for 4 s. Your next foul or tackle deals 40% more damage.
- **2 · Blink Strike** (10 s): Teleport to an enemy in range, steal the ball if they have it and knock them down.
- **3 · Phantom Dribble** (12 s): Send an afterimage dribbling a fake ball toward the aim for 3 s, drawing tackles.
- **Ultimate · Dimension Break:** With the ball (or near it), teleport it and yourself to the aim point; an illusion left behind explodes on enemies after 4 s.

#### Speedster · The Velocity Ace (#11)

- **Passive · Momentum:** Build up to 3 speed stacks while moving (+7% speed each). At 3 stacks, tackles on you succeed 15% less.
- **1 · Dash Burst** (6 s): A high-speed dash that knocks enemies aside.
- **2 · Afterimage** (12 s): Leave a clone that copies your movement for 3 s; enemies can tackle it by mistake.
- **3 · Speed Dribble** (14 s): 4 s of ultra-fast dribbling; anyone who tackles you is stunned for 1 s instead.
- **Ultimate · Time Rush:** 6 s of accelerated time: +40% speed, the ball can't be taken off you, immune to knockdowns, and enemies near you slow down.

### Defense · Goal protection, area control, disruption

#### Tank · The Iron Wall (#4)

- **Passive · Unbreakable:** Take 25% less damage and can't be knocked down during a tackle or slide.
- **1 · Body Block** (10 s): Raise a barrier in front of you that stops the ball and enemies for 2.5 s.
- **2 · Bull Rush** (9 s): Charge forward, pushing enemies and the ball aside and knocking them down.
- **3 · Quake Tackle** (12 s): Slam the ground and trip every enemy close to you.
- **Ultimate · Titan's Guard:** A dome for 6 s that bounces shots away and halves damage to team-mates inside.

#### Defender · The Interceptor (#3)

- **Passive · Field Control:** +20% interception range and +15% tackle success.
- **1 · Intervene** (8 s): Dash straight to an opponent and make a clean tackle if they have the ball.
- **2 · Zone Lock** (12 s): A 4 s zone that slows enemies by 40% and makes them easier to tackle.
- **3 · Tackle Charge** (10 s): A crunching tackle that knocks the ball far away and stuns the target for 1.5 s.
- **Ultimate · Absolute Mark:** Mark an enemy for 8 s: they slow down with the ball, can't use skills, and you get a speed boost.

#### Goalkeeper · The Last Line (#1)

- **Passive · Instinct Save:** +30% save range. Picking this class puts you in goal.
- **1 · Dive Save** (4 s): A long dive toward the aim that blocks the ball and knocks enemies away.
- **2 · Wide Guard** (12 s): For 3 s your save area grows by 80%.
- **3 · Aerial Grab** (6 s): Leap to catch high balls, volleys and headers.
- **Ultimate · Infinity Save:** A barrier over your goal for 5 s that blocks every shot and sends the ball back to midfield.

### Support · Team sustain, buffs, healing, utility

#### Playmaker · The Game Maker (#8)

- **Passive · Visionary:** Your passes never wander and give the receiver a short speed boost.
- **1 · Precision Pass** (6 s): A pinpoint pass that slips through opponents and can't be intercepted.
- **2 · Tactical Zone** (14 s): A 5 s zone where team-mates get +15% speed and shot power.
- **3 · Assist Mark** (12 s): Mark a team-mate: your next pass to them can't be intercepted, and they get +30% shot power and +20% speed for 3 s.
- **Ultimate · Perfect Play:** The whole team gets +30% speed and +25% shot power for 8 s, and their passes can't be intercepted.

#### Healer · The Team Mender (#6)

- **Passive · Regeneration Field:** Team-mates near you recover 2 HP and 2 stamina per second.
- **1 · Heal Burst** (10 s): Restore 35 HP to a team-mate (or yourself).
- **2 · Cleanse** (12 s): Remove stuns, slows, glue, freezes and marks from a team-mate.
- **3 · Revive** (25 s, shared by the team): Get a knocked-out team-mate back up with 50% HP. The cooldown is shared by your team.
- **Ultimate · Lifeweaver:** A big healing field for 6 s: fast HP and stamina recovery, cleansed stuns, and no knockdowns inside.

#### Aura · The Team Engine (#5)

- **Passive · Team Spirit:** Team-mates near you get +6% speed, +6% stamina recovery and +5% shot power.
- **1 · Morale Boost** (14 s): Swing the crowd your way, give every team-mate 15 charge and +8% performance for 4 s.
- **2 · Stat Aura** (10 s): Each use cycles the aura: Offense (+15% shot power), Defense (−20% damage), Speed (+12%), for 6 s on nearby team-mates.
- **3 · Stamina Surge** (12 s): Restore 40 stamina to every team-mate near you.
- **Ultimate · Team Awakening:** For 8 s the team gets +30% speed and shot power, takes 20% less damage, and their fouls go unseen.

### Disrupt · Chaos control, mind games, field manipulation

#### Brawler · The Field Rioter (#2)

- **Passive · Adrenaline:** +10% damage for every successful foul, stacking 3 times.
- **1 · Heavy Punch** (6 s): A huge punch that sends the target flying and makes them drop the ball.
- **2 · Grab & Throw** (12 s): Grab an enemy and throw them toward the aim; they're stunned for 2 s on landing.
- **3 · Ground Slam** (12 s): A shockwave that knocks down every enemy around you.
- **Ultimate · Rage Mode:** 7 s berserk: +25% damage, bigger, faster and immune to knockdowns.

#### Trickster · The Illusionist (#13)

- **Passive · Mind Game:** Anything you hit has a 15% chance to be confused for 1.5 s (controls reversed).
- **1 · Clone Decoy** (10 s): A clone runs toward the aim with a fake ball for 4 s, pulling defenders away.
- **2 · Trap** (8 s): Plant a snare that trips the first enemy to step on it.
- **3 · Referee Jammer** (20 s, shared by the team): Scramble the referee's vision for 4 s. The cooldown is shared by your team.
- **Ultimate · Grand Illusion:** Three clones with fake balls burst out around the ball for 6 s, hiding the real one.

#### Ranger · The Field Sniper (#14)

- **Passive · Tactical Scope:** +15% ability range and +15% projectile speed, including weapons.
- **1 · Projectile Pass** (6 s): A rocket of a pass that flies straight through enemies.
- **2 · Gravity Mine** (12 s): A 3 s gravity field that slows enemies and drags them (and the ball) toward the middle.
- **3 · Slow Bomb** (12 s): Lob a bomb that leaves a wide 40% slow field for 4 s.
- **Ultimate · Orbital Strike:** Call down a blast on the aim after 1.5 s: enemies there are stunned for 3 s and the ball is launched toward goal.

### Synergies

- **Final Push** (striker + playmaker + aura): Massive offensive pressure: the team shoots 5% harder.
- **Unbreakable Wall** (tank + defender + goalkeeper): Extreme defence: the team takes 10% less damage.
- **Chaos Engine** (brawler + trickster + assassin): Confusion everywhere: the team's fouls take 20% longer to be spotted.
- **Sustain Core** (healer + aura + any): High survivability: the team recovers 1 HP per second.

### Bot line-ups (forward, midfielder, defender, defender; the keeper is always a Goalkeeper)

- **balanced:** striker, playmaker, defender, healer
- **aggressive:** assassin, speedster, brawler, aura
- **control:** ranger, playmaker, tank, trickster

Ranged weapons from the crowd: **slingshot** (5 pebbles: 10 damage, short stun) and **foam blaster** (10 darts: 4 damage and a brief slow). Fire them with `Q` (instead of punching); hitting a player is a "ranged attack" foul.

## 8b. Earlier role draft (superseded by the classes above)

Roles give each position a job, a small stat profile and one **active ability**. Everyone still has the shared moves
(pass, long pass, shoot, foul, sand, sprint). Roles are picked in the lobby; bots get sensible defaults.

**Stat modifiers** are percentages on the current values: speed 155 units/s, shot speed 430–810 (+20% strikers already),
tackle chance, foul reach 42 (60 with a bat), charge gain.

| Role | Count per team | Stat profile | Passive | Active ability (new Ability key) | Ultimate (costs 60 charge) |
|---|---|---|---|---|---|
| **Goalkeeper** | 1 (bots by default) | Speed −10%, dive reach 95 → 120 | **Claim:** can't be fouled inside own goal area; catches mid-height shots | **Long throw:** throws the ball to any team-mate on screen with perfect accuracy | **Wall:** for 3 s the goal mouth narrows by 25% |
| **Defender** | 1–2 | Speed −5%, tackle +30%, foul reach +10% | **Bodyguard:** fouls against team-mates within 80 of you are 30% more likely to be seen by the referee | **Slide tackle:** fast 120-unit slide; wins the ball clean if it hits the ball first, counts as a foul if it hits the player | **Lockdown:** marks one attacker; they lose sprint for 4 s |
| **Midfielder** | 1–2 | Pass speed +10%, charge gain +25% | **Vision:** sees the pass guide to two team-mates (best + second best) | **Through ball:** next long pass curves around the nearest defender and leads the receiver extra | **Tempo:** your team's charge fills 2× for 6 s |
| **Striker** | 1 | Shot speed +20% (exists), sprint drain −20% | **Poacher:** power shots need 15 charge instead of 25 | **Curler:** next shot bends around the keeper (sideways curve of 60 units) | **Thunderbolt:** next shot is a power shot at full pace that knocks the keeper down if they stop it |
| **Captain** | 1 per team, any position (an armband on top of their role) | No stat change | **Leadership:** team-mates within 150 of you gain +10% speed; your karma counts double for the referee's opinion of your team | **Rally:** heals team-mates within 150 by 25 HP and clears stuns | **Protest:** the referee re-checks the last foul against your team (60% to call it, but −15 karma if it was a dive) |
| **Backseat** | 0–1 per team, on the pitch in any outfield spot | **No stat changes** and no special moves | **Loud mouth:** every trick also builds **Annoyance** in nearby team-mates (see 8.1) | **Two tricks** chosen before kickoff from the trick list (8.1), each on its own cooldown | **Meltdown** (see 8.1): a match-swinging trick with a big backfire, once per half |

### 8.1 The Backseat: the player who won't stop talking

An ordinary outfield player (normal speed, shots, passes and tackles) whose edge is **mind games**. Every trick has a
cooldown, and almost every trick can **backfire on their own team**. They're fun to play, a nightmare to play against,
and a gamble for their own side.

#### New system: Mood

Every player gets a **mood** from −100 (tilted) to +100 (in the zone), starting at 0 and drifting back toward 0 by
5 points per second. Mood shows as a small icon over the player (storm cloud, question marks, steam, sparkles) and as a
bar on the player panel.

| Mood | Effect |
|---|---|
| +40 or more (**In the zone**) | Shot spread −15%, charge gain +15% |
| −40 or less (**Tilted**) | Shot spread +25%, pass lead error up to 25 units, tackle success −20% |
| −70 or less (**Meltdown**) | As tilted, and fouls this player commits are 30% more likely to be seen (they get sloppy) |

Mood also moves from normal play: a goal +40 for the scorer, conceding −15 for the whole team, being fouled −10,
helping someone up +10, and a help-up received +15. So the Backseat's tricks push on a meter everyone already has.

#### New system: Annoyance (the double edge)

Each team-mate has **Annoyance** toward their own Backseat, from 0 to 100. Every trick adds Annoyance to team-mates
within 200 units (amounts in the trick table). It fades by 3 per second.

| Annoyance | What the team-mate does |
|---|---|
| 50+ | Mood −10 and won't pass to the Backseat if anyone else is open (bots); humans see an "ignore them" hint |
| 80+ | Their passes to the Backseat are 30% slower and land behind them |
| 100 (**Snaps**) | Bots shove the Backseat (a team foul, so the referee can card it); humans get 3 s where their pass key skips the Backseat. Annoyance resets to 40 |

So spamming tricks wrecks your own team's chemistry. A good Backseat times one trick when it matters.

#### Trick list

Pick **two** before kickoff (P1 trick key and P2 trick key, or one key that cycles). Range is from the Backseat.
"Target" means the opponent the trick is aimed at; aim uses the same red-ring targeting as fouls.

| Trick | What it does to the opponent | Backfire on your team | Cooldown | Range | Counter |
|---|---|---|---|---|---|
| **Backseat Driving** "Left! No, RIGHT!" | Target's movement input is **mirrored for 1.2 s** | 30% chance your nearest team-mate is mirrored for 0.6 s too. Annoyance +15 | 18 s | 160 | Stand still for a moment; the Captain's Rally clears it |
| **Trash Talk** "My nan tackles harder" | Target mood −30 | The target is **fired up**: +20% tackle success against *you* for 6 s. Your karma −6 | 15 s | 220 | Score or get a help-up to recover mood |
| **Fake Call** "Leave it!" | The next pass to the target is left to roll past them (they can't pick it up for 0.6 s) | 25% chance the nearest team-mate of *yours* also leaves the next ball meant for them. Annoyance +10 | 20 s | 200 | Call it out: take the ball with a short pass yourself first |
| **Ref Whisperer** "Ref, did you see that?" | The referee turns to look at you for 2 s, so they miss what's behind them | Fouls **against your own team** in those 2 s go unseen too. If the referee already thinks badly of you, −10 referee opinion | 25 s | 300 (to the referee) | Foul the Backseat while the referee is looking straight at them |
| **The Stare-down** | Target's controls react 0.25 s late for 3 s | **You can't move** for 1.5 s while staring. Annoyance +10 | 20 s | 140 | Pass before the stare lands; the Backseat is a sitting duck |
| **Wind-up the Keeper** "Butterfingers!" | Opposing keeper's dive reach −30% for 5 s | The keeper gets angry: their next save is booted 900 units straight up the pitch, often starting a counter against you | 30 s | Whole pitch | Shoot early or pass instead of shooting |
| **Blame Game** (only right after your team concedes) | — | A team-mate of your choice: mood −25, and *you* gain +30 mood and +20 charge. Annoyance +25 | Once per goal conceded | Team | The blamed team-mate can Trash Talk you back (if they're also a Backseat) or just foul you |
| **Hype Man** "You're the GOAT!" | — | A team-mate gets +30 mood but turns **overconfident** for 6 s: shots +15% speed and +30% spread, and they won't pass. Annoyance +5 | 16 s | 180 | It's your own team-mate: choose wisely |
| **Dive** (simulation) | You fall over near an opponent. If the referee sees it from 160+ away, 40% they give **you** a free kick | If the referee is within 160 or the dice say no: **yellow card for diving**, crowd Villainy +, every team-mate's mood −10 | 30 s | Opponent within 40 | Stay away from the Backseat near the referee |

**Meltdown (once per half, needs 60 charge):** the Backseat throws a full tantrum for 3 s (stomping, arms waving). Every
opponent within 250 gets mood −35 and their controls react 0.2 s late for 3 s, **but** every team-mate within 250 gets
Annoyance +40, the Backseat can't move during it, and if the referee sees it, it's a yellow card for dissent.

#### Fit with the rest of the game

- **No field ability:** the Backseat's stats are exactly those of the outfield slot they take; tricks never touch the ball
  directly.
- **Crowd opinion (§7):** tricks that land raise the Backseat team's **Fun** and **Drama**; backfires raise **Noobie-ness**;
  Dive and Ref Whisperer raise **Villainy**. A crowd that loves chaos can end up backing the Backseat's team anyway.
- **Karma and referee opinion:** Trash Talk, Dive and Meltdown cost karma, so a Backseat who overdoes it gets *marked* by
  the referee (fouls against them are ignored more), which is its own punishment.
- **Bots as Backseat:** bots pick two tricks at random and use them when a target is in range and their team is losing or
  drawing. Bot team-mates react to Annoyance as described.
- **Caps:** at most one Backseat per team; tricks never stack on the same target (a 6 s immunity after any trick); every
  trick shows a speech bubble ("LEFT! NO, RIGHT!") so it's always clear who did it.
- **Metrics:** tricks used, tricks landed, backfires, team-mates snapped and mood swings go into the match report, which
  tells us quickly whether the Backseat is fun or just annoying.

### Role picking

- Lobby: each human picks a role; the lobby enforces counts (one goalkeeper, one captain per team) and fills the rest
  with bots in sensible roles.
- Captain: humans can claim it; otherwise the team's highest-karma human, else a bot.
- Bots: the existing formation already has a keeper, defenders, a midfielder and a forward, so bots map onto roles directly.
- The role travels with the skin in the roster entry (`roster[uid].role`), validated by the host the same way.

### Balance guard-rails

- Every active ability has a cooldown (12–25 s) and shows on the player panel as a slot with a ring timer, like the sand slot.
- Ultimates cost 60 charge, so they compete with sprint and power shots for the same meter.
- Abilities that affect the referee are capped (one referee-related ability per team per minute).
- New metrics per ability (uses, successes) go into the match report so balance can be tuned from real data, using the
  existing `data-metric` pipeline.

## 9. Ability catalog

A flat list for review. Values are starting points for testing.

| ID | Role | Kind | Effect | Cooldown | Counter |
|---|---|---|---|---|---|
| `gk.claim` | Goalkeeper | Passive | Can't be fouled in own goal area | — | Shoot before they reach the area |
| `gk.longThrow` | Goalkeeper | Active | Perfect throw to a chosen visible team-mate (max 900 units) | 15 s | Intercept the receiver |
| `gk.wall` | Goalkeeper | Ultimate | Goal mouth −25% for 3 s | 60 charge | Wait it out; shoot from range after |
| `def.bodyguard` | Defender | Passive | +30% chance the referee spots fouls on nearby team-mates | — | Foul away from defenders |
| `def.slide` | Defender | Active | 120-unit slide; clean if ball first, foul if player first | 12 s | Pass early, or sidestep |
| `def.lockdown` | Defender | Ultimate | Marked attacker can't sprint for 4 s | 60 charge | Pass to someone else |
| `mid.vision` | Midfielder | Passive | Two pass guides | — | — |
| `mid.through` | Midfielder | Active | Next long pass curves around the nearest defender | 14 s | Defender stays goal-side |
| `mid.tempo` | Midfielder | Ultimate | Team charge gain ×2 for 6 s | 60 charge | Foul to break the rhythm |
| `st.poacher` | Striker | Passive | Power shots at 15 charge instead of 25 | — | Keeper positioning |
| `st.curler` | Striker | Active | Next shot bends up to 60 units sideways | 14 s | Keeper waits before diving |
| `st.thunder` | Striker | Ultimate | Full-power shot; keeper who stops it is knocked down 1 s | 60 charge | Block the shot before it's taken |
| `cap.leadership` | Captain | Passive | +10% speed to team-mates within 150; karma counts double for team referee opinion | — | Isolate the captain |
| `cap.rally` | Captain | Active | +25 HP and clear stuns for team-mates within 150 | 25 s | Foul the captain first |
| `cap.protest` | Captain | Ultimate | Referee re-checks the last foul against your team (60%); −15 karma if it wasn't a foul | 60 charge | Don't foul where it can be reviewed |
| `bs.loudMouth` | Backseat | Passive | Every trick adds Annoyance to team-mates within 200 | — | Use tricks sparingly |
| `bs.driving` | Backseat | Trick | Mirror target's movement 1.2 s; 30% backfire on nearest team-mate | 18 s | Stop moving briefly |
| `bs.trashTalk` | Backseat | Trick | Target mood −30; target gets +20% tackles vs the Backseat | 15 s | Recover mood |
| `bs.fakeCall` | Backseat | Trick | Target ignores the next ball 0.6 s; 25% backfire | 20 s | Collect it with a short pass |
| `bs.refWhisper` | Backseat | Trick | Referee looks at the Backseat 2 s; fouls on both teams unseen | 25 s | Foul the Backseat in front of the referee |
| `bs.stare` | Backseat | Trick | Target controls lag 0.25 s for 3 s; Backseat rooted 1.5 s | 20 s | Pass early |
| `bs.windUp` | Backseat | Trick | Keeper dive reach −30% 5 s; keeper's next save is a long counter | 30 s | Shoot early or pass |
| `bs.blame` | Backseat | Trick | After conceding: team-mate mood −25, Backseat +30 mood, +20 charge | Once per goal conceded | Foul the Backseat |
| `bs.hype` | Backseat | Trick | Team-mate +30 mood but overconfident 6 s (+speed, +spread, won't pass) | 16 s | — |
| `bs.dive` | Backseat | Trick | 40% free kick if the referee is far; else yellow for diving and team mood −10 | 30 s | Stay clear of the Backseat near the referee |
| `bs.meltdown` | Backseat | Ultimate | Opponents within 250: mood −35, controls lag 0.2 s for 3 s; team-mates Annoyance +40; Backseat rooted; yellow if seen | Once per half, 60 charge | Get out of range |

## 10. Network messages

All of this fits the current host-runs-everything design. New messages are small and validated by the host.

| Message | From → to | When | Payload |
|---|---|---|---|
| `hello` (extended) | Player → host | On join | `{ name, skin, role }` |
| `skin` | Player → host | Lobby only | `{ skin }` |
| `role` | Player → host | Lobby only | `{ role }` |
| `ready` | Player → host | Lobby | `{ ready: true }` |
| `roster` (extended) | Host → all | Lobby and joins | each entry gains `skin`, `role`, `ready` |
| `in` (extended) | Player → host | Every input change | counters gain `ability`, `ult`, `taunt`, `trick1`, `trick2` (same edge-counter pattern as pass/foul) |
| snapshot (extended) | Host → all | 20 per second | `cr` (crowd meter), `ab` (per-player ability and trick cooldowns), `md` (mood per player, rounded), `an` (Annoyance per team-mate of a Backseat), `fx` (one-shot animation and speech-bubble events: id, type, player) |
| `rematch` | Player → host | Full time | `{ vote: true }` |

`fx` events carry the big moments from §5 (goal, save, power shot, knockout, caught foul, celebration id), so every
screen plays the same animation at the same time without sending animation data.

## 11. Suggested order

| Phase | What | Why first |
|---|---|---|
| 1 | Ready-up, rematch vote, post-match awards, grudge tracker | Small, immediately makes rooms feel social |
| 2 | Taunt wheel + `fx` animation events for fouls, saves, goals | Biggest jump in personality per hour of work |
| 3 | Character creator + skin sharing in the roster | People want to be recognisable before playing more |
| 4 | Audience opinion meter, chants and banners | Builds on the events from phase 2 |
| 5 | Roles: passives first, then actives, then ultimates | Needs the most balancing; use the metrics files to tune |
| 6 | Power-ups and mutators | Easy to add once the rest is stable; keep them optional |

## 12. Open questions

1. **Backseat:** decided: an on-pitch player with no field ability and double-edged tricks (§8.1). Should players pick 2 tricks, or get 1 trick + Meltdown?
2. **Taunt key:** `T` is sand for P1 today. Use `Z` (P1) and `Backslash` (P2), or a hold-to-open wheel on an existing key?
3. **Skins and fairness:** keep height and build purely cosmetic (current proposal), or allow small trade-offs?
4. **Crowd pressure:** is the +10% shot spread for a team the crowd turns against fun, or too punishing?
5. **Power-ups:** always on, or only in "Party" rooms via mutators?
6. **Ultimates:** share the charge meter (proposal) or get their own meter?
