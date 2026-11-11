/* Foul Play FC · js/ui/guide.js
   How to play.
   Classic script sharing one global scope with the rest of js/; index.html loads them in order. */
'use strict';

/* ---------------- How to play ---------------- */
let guideFrom = 'menu', guideTab = 'g-basics', showGuideTab = null;
function guideSections() {
  const b = BINDS[0], k = a => `<kbd>${esc(keyLabel(b[a]))}</kbd>`, label = Object.fromEntries(ACTIONS);
  const keyRows = ACTIONS.map(([a]) => `<tr><td>${esc(label[a])}</td><td><kbd>${esc(keyLabel(BINDS[0][a]))}</kbd></td><td><kbd>${esc(keyLabel(BINDS[1][a]))}</kbd></td></tr>`).join('');
  return [
    ['g-basics', 'The basics', `
      <p>Foul Play FC is small-sided football where fouls are part of the game. Score more goals than the other team before the clock runs out. Play 5v5 on a full-size pitch or 3v3 on a small one (Pace and controls → Game), and bots play every spot a person isn't playing.</p>
      <p>You can foul anyone you can reach, on either team. One referee is watching, but only sees what's inside the yellow vision cone. Get caught and you get a card. Stay out of sight and the crowd loves you for it.</p>
      <h4>Reading the screen</h4>
      <ul>
        <li><b>Your player</b> has a dashed ring, an arrow showing which way you face, and a name tag (P1, P2 or YOU).</li>
        <li><b>The yellow cone</b> shows what the referee can see. It turns red while it covers you.</li>
        <li><b>The camera</b> keeps the ball in the middle of the screen. The mini-map at the bottom shows everyone, and an arrow at the edge of the screen points to your player when they're out of view, with their distance from the ball.</li>
        <li><b>Your panel</b> at the top left shows health, the crowd meter, charge, karma, the referee's opinion of you and your items, each with the key that uses it.</li>
        <li><b>A red ring</b> marks the player you would foul. A green ring means that player is down and you would help them up instead.</li>
      </ul>`],
    ['g-controls', 'Controls', `
      <div class="tablewrap"><table><thead><tr><th>Action</th><th>Player 1</th><th>Player 2</th></tr></thead><tbody>${keyRows}</tbody></table></div>
      <p>In solo play either column works${MAPSOLO.shoot.includes('Space') ? ', and <kbd>Space</kbd> also shoots' : ''}. <kbd>Esc</kbd> pauses and <kbd>M</kbd> mutes. Change any key in <b>Pace and controls → Controls</b>.</p>
      <p class="note">On a phone or tablet, drag anywhere on the left side to move and use the buttons on the right.</p>`],
    ['g-ball', 'Playing the ball', `
      <ul>
        <li><b>Move</b> with ${k('up')} ${k('left')} ${k('down')} ${k('right')}.</li>
        <li><b>Every pass has power:</b> hold the key and release. A line shows where it's going while you hold: a ring on the team-mate who'll get it, or an arrow to where the ball ends up. A tap plays a soft, short ball; a full hold plays it hard and far.</li>
        <li><b>Short pass</b> with ${k('pass')}: along the ground. Pass assist finds a team-mate only if you're facing them (within about 30°); more power prefers ones further away. Nobody there, and the ball goes into space where you aim.</li>
        <li><b>Long pass</b> with ${k('lpass')}: in the air, to a team-mate you're facing with space around them, or into space.</li>
        <li><b>Through ball</b> with ${k('through')}: kicked forward along the ground exactly where you aim, with no assist, rolling out to a distance set by the power. Play it into space for a runner.</li>
        <li><b>Switch player:</b> press ${k('pass')} when you don't have the ball to take over the team-mate nearest the ball.</li>
        <li><b>Shoot:</b> hold ${k('shoot')} to build power, then release. A full-power shot can fly over the bar. Strikers shoot about 20% harder than everyone else.</li>
        <li><b>Goalkeepers</b> dive for shots that pass within reach, so aim for the corners.</li>
        <li><b>Effects:</b> only powerful strikes (a hard charged shot, rocket boots or a power-shot skill) get a ball trail and leave fire on the grass, and every hit lands with a comic-book "WHACK!".</li>
        <li><b>Ball physics:</b> shooting while running across the ball puts a little curl on it, the ball bounces and rolls to a stop, shots can come back off the post or the bar, and a hard shot that hits someone's body or head is blocked.</li>
        <li><b>Momentum:</b> players speed up a little slower than they stop, and turning sharply at full pace takes longer.</li>
        <li><b>Tackle:</b> press ${k('through')} without the ball for a quick lunge at the ball carrier. Cheap, safe and never a foul.</li>
        <li><b>Sliding tackle:</b> press ${k('lpass')} without the ball to slide in the direction you're pressing. From the front it usually wins the ball cleanly; from behind, or into a player without the ball, it trips them, and that's a foul the referee can see. Costs 12 stamina, and you need a moment to get up.</li>
        <li><b>Jump:</b> press ${k('shoot')} without the ball. In the air, press ${k('shoot')} again to volley or head the ball at goal as it reaches you, or ${k('pass')} / ${k('lpass')} for a headed pass.</li>
        <li><b>Sprint:</b> hold ${k('sprint')}. Sprinting uses stamina.</li>
      </ul>`],
    ['g-fouls', 'Fouls and referees', `
      <ul>
        <li><b>Base attack:</b> hold ${k('foul')} to aim and let go to strike. While you hold it, the guide shows your reach and rings the player you'd hit: aim assist picks whoever is closest to your aim, opponents first. If they're just out of reach you lunge in. With no one there you swing at thin air. Hitting your own team-mates still counts.</li>
        <li>Hard fouls can <b>injure</b>: an injured player's stamina is capped until a med kit heals them, and their mood drops.</li>
        <li><b>Carry the referee:</b> stand next to them and press ${k('item')} to hoist them onto your shoulders. They keep watching wherever you face, so point them at the other team's dirty work, or away from your own. Press ${k('item')} again to throw them across the pitch in the direction you're facing. They wriggle free after 8 seconds, and you can't play the ball while carrying.</li>
        <li>A foul knocks the player down, takes the ball off them and costs them health. At zero health they are knocked out for 6 seconds.</li>
        <li>The referee works inside the pitch, behind and to the far side of play. They see everything inside their cone and anything right next to them. They turn toward commotion, so a foul can still be spotted a moment after it happens.</li>
        <li><b>Caught:</b> a yellow card and a free kick to the other team, or a penalty if it happened in your own box. A second yellow, any bat foul or a knockout is a red card: off the pitch for 25 seconds.</li>
        <li><b>Not caught:</b> the crowd cheers and your popularity goes up.</li>
      </ul>`],
    ['g-tricks', 'Sand, items and the crowd', `
      <ul>
        <li><b>Sand</b> (${k('blind')}) blinds the referee for 4.5 seconds if they're in reach. You carry up to 2, and one refills every 22 seconds. While the referee is blinded nobody calls fouls, but if they see you throw it, that's a card.</li>
        <li><b>The crowd meter</b> fills with goals, assists, tackles, saves and fouls nobody saw. When it is full the crowd throws you a gift. Anyone can grab it after a moment, so be quick.</li>
      </ul>
      <h4>Items on the pitch</h4>
      <p>Only five items ever land on the pitch, thrown by the crowd or from a team's bench:</p>
      <ul>
        <li><b>Med kit:</b> 45 health back and heals injuries.</li>
        <li><b>Ultimate charge:</b> fills half of your ultimate.</li>
        <li><b>Sword:</b> your next 3 fouls (${k('foul')}) slash harder and reach further. A sword foul seen by a referee is always a red card.</li>
        <li><b>Rocket boots:</b> your next 3 shots fly 35% faster with a fire trail.</li>
        <li><b>Fake whistle:</b> blow it with ${k('item')} and nearby opponents stop for a moment.</li>
      </ul>
      <h4>The bench</h4>
      <p>A red card sends you to your team's bench beside the near touchline for 25 seconds; the timer shows over your head and you walk back on when it runs out. On the bench you can still taunt (${k('taunt')}), and every few seconds you're handed a random item: press ${k('item')} to throw it in to a team-mate (med kits go to whoever is most hurt). If you play as one character you stay on the bench yourself; otherwise you take over a team-mate and the bench throws its items in by itself.</p>`],
    ['g-charge', 'Charge, karma, reputation', `
      <h4>Charge</h4>
      <p>The blue bar. It fills while you have the ball and when you tackle, complete passes, make saves, score or assist. It powers:</p>
      <ul>
        <li><b>Power shots:</b> any shot with 25% or more charge spends 25 and becomes far more accurate. The tick on the bar marks 25%.</li>
      </ul>
      <p>Being caught fouling costs 30 charge. A red card empties it.</p>
      <h4>Karma</h4>
      <p>Every foul lowers your karma, seen or not. Clean tackles, 30 seconds without a foul and helping players up raise it. To help a downed player up, press ${k('foul')} when the ring around them is green. Bots go after low-karma players, and the whole match gets angrier as fouls pile up.</p>
      <h4>Referee opinion</h4>
      <p>Built mostly from your charge, plus your karma, minus every foul you've been caught for. A referee who <b>trusts you</b> sometimes waves your foul away, which costs you 20 charge. If a referee <b>has you marked</b>, fouls against you may be ignored.</p>`],
    ['g-stamina', 'Stamina, mood and injuries', `
      <h4>Stamina</h4>
      <p>The green bar. Sprinting (${k('sprint')}) drains it, and every shot costs some: a tired player's shots are weaker. It refills on its own, fastest when you stand still.</p>
      <h4>Injuries</h4>
      <p>Sword hits and knockouts can injure. The striped part of the stamina bar is lost until a med kit heals the injury, and a bandage shows over the player's head.</p>
      <h4>Mood</h4>
      <p>Every player has one. Goals, saves, tackles and helping people up lift it; being fouled, injured, caught or conceding lowers it.</p>
      <ul><li><b>In the zone</b> (+40): sharper shots and faster charge. A gold sparkle shows over the player.</li>
        <li><b>Tilted</b> (−40): wilder shots, wandering passes, weaker tackles. A grey cloud shows.</li>
        <li><b>Meltdown</b> (−70): as tilted, and their fouls are easier for the referee to spot.</li></ul>`],
    ['g-crowd', 'Crowd, taunts and power-ups', `
      <h4>The crowd's opinion</h4>
      <p>The crowd rates each team on Fun, Performance, Noobie-ness, Sympathy, Villainy and Drama. The bar under the score shows who they back; hold <kbd>Tab</kbd> for the breakdown. They chant and unfurl banners to match their mood, send more gifts to the team they back, and when one team has 75% support the other team's shots get shakier for a while.</p>
      <h4>Taunts</h4>
      <p>Hold ${k('taunt')}, pick a direction, and let go: Too easy!, Nice try!, Sorry!, Ref! REF!, Come at me, GG. Taunting fires up the nearest opponent (their tackles on you get better), "Ref! REF!" makes the referee look at you, and "Sorry!" right after a foul wins back a little karma. Three seconds between taunts.</p>
      <h4>Power-ups</h4>
      <p>In matches, the crowd's power-ups are rocket boots, ultimate charges and fake whistles (see <b>Sand, items and the crowd</b>).</p>
      <h4>Playground extras</h4>
      <p>The Playground's admin panel can still hand out the older items (bats, bananas, glue, smoke bombs, decoys, slingshots and more) for testing; they no longer appear in matches.</p>`],
    ['g-classes', 'Classes, skills and aiming', `
      <p>Every player has one of 12 classes (see <b>Classes &amp; skills</b> in the menu). Each has a passive, a base attack, two spells and an ultimate, shown on the hotbar at the bottom of the screen.</p>
      <ul><li><b>Hold to aim, release to cast:</b> ${k('foul')} attack, ${k('skill1')} spell 1, ${k('skill2')} spell 2, ${k('ult')} ultimate. While you hold the key, a guide shows the range, the player it would hit, or where it would land. Steer with the movement keys and let go to fire.</li>
        <li><b>Aim assist:</b> a targeted spell or attack locks onto the player closest to your aim (within about 35°). Spells that land on a spot snap onto an opponent you're aiming at.</li>
        <li><b>Spells</b> have a cooldown shown on their slot. The <b>ultimate</b> charges over time and faster with good play; the slot glows when it's ready.</li>
        <li><b>Aiming:</b> passes, shots, spells, attacks and weapons all go the way the arrow under your player points. It turns smoothly rather than snapping, so hold a direction to line up and tap a key to nudge it a few degrees.</li>
        <li><b>Sword:</b> pick one up from the crowd or a bench and your base attack (${k('foul')}) slashes instead, harder and from further away. A sword foul the referee sees is a straight red. (Slingshots and foam blasters are Playground-only now.)</li>
        <li><b>Play as one character:</b> in Pace and controls → Game you can stop switching between team-mates and stay as your chosen class all match.</li>
        <li><b>Dirty skills</b> like Heavy Punch, Grab &amp; Throw or Bull Rush count as fouls when they hit someone. Cloak, stealth and Team Awakening hide your fouls from the referee.</li></ul>`],
    ['g-anomalies', 'Anomalies', `
      <p>Every so often something strange happens mid-match. The bar under the crowd meter fills up until the next one and flashes "Something's coming" just before; while one is on, it names it.</p>
      <ul>${ANOM_LIST.map(([k, n, d]) => `<li><b>${n}:</b> ${d}</li>`).join('')}</ul>
      <p>Set how often they happen (Off, Rare, Normal, Frequent or Chaos) and which ones are allowed in <b>Pace and controls → Game</b>. You can also change the meter from the pause menu mid-match. Online, the host's settings are used. Abducted and kidnapped players come back on their own.</p>`],
    ['g-party', 'Party features', `
      <ul><li><b>Golden goal and penalties:</b> a draw at full time plays 60 s of golden goal, then a penalty shoot-out.</li>
        <li><b>Goal replays:</b> after each goal, a slow replay of the build-up. The host can skip it with shoot or pass.</li>
        <li><b>Grudges:</b> your panel shows who has fouled you most. Paying them back is a crowd-pleasing "Revenge!".</li>
        <li><b>Bounties:</b> every 45 s the crowd puts a price on the dirtiest player or their favourite. Win the ball off them, or foul them unseen, for a gift.</li>
        <li><b>Spectators:</b> online, anyone watching can cheer for a team every 15 s and send one gift per half.</li>
        <li><b>Your character:</b> build a look in the menu. Online, everyone sees it in the lobby before kickoff. Share it with a skin code.</li>
        <li><b>Online lobby:</b> guests press I'm ready; at full time everyone can vote for a rematch with sides swapped. Click a name to mute their taunts.</li>
        <li><b>Party mutators:</b> big heads, banana rain, no referee, low gravity, super sprint or classic gifts only, in Pace and controls.</li></ul>`],
    ['g-setpieces', 'Free kicks and penalties', `
      <ul>
        <li>When a foul is called the clock stops and everyone gets <b>15 seconds to set up</b> (10 for a penalty). In 3D the camera swings round behind the ball, facing the goal.</li>
        <li><b>The laws apply while you set up:</b> defenders stay outside the dashed 9.15 m circle around the ball, and the attacking team stays behind the offside line (the dashed line in their colour). For a penalty, everyone but the taker and the goalkeeper stays outside the box, and the keeper stays on the line.</li>
        <li><b>The wall:</b> defending bots line up between the ball and the near post and jump as the kick is taken. People on the defending team can join it or mark someone.</li>
        <li><b>Taking it:</b> move the yellow target across the goal with left and right, and up and down for height. The dotted line shows the flight: the shot curls round the wall by itself. After the whistle, hold ${k('shoot')} and release inside the green band on the power bar to hit your target; too much power flies high, too little drops short. With 25 charge the green band is wider. You can also pass with ${k('pass')}, ${k('lpass')} or ${k('through')}.</li>
        <li><b>Two views:</b> ${k('view')} switches the taker between the view behind the ball and the normal side view (your choice is remembered). In the side view you aim with movement like in open play, so you can pass anywhere, including back to a defender, or shoot along your aim. Skills and ultimates work during the set-up too, and power-shot skills boost a free kick.</li>
        <li>If the time runs out, the kick is taken for you.</li>
      </ul>`],
    ['g-modes', 'Game modes', `
      <ul>
        <li><b>Solo vs bots:</b> you lead the Harbor Hounds.</li>
        <li><b>2 players:</b> on one keyboard, as rivals or as teammates.</li>
        <li><b>Watch the bots:</b> bots only, with one referee.</li>
        <li><b>Play online:</b> create a room and share the 5-letter code. Friends open the same game link and join with it. The host's browser runs the match, so the host keeps that tab open and visible. If a friend's network blocks direct connections, a host running the game on their computer with a Cloudflare link gets a <b>backup link</b> in the lobby; friends who open it join the same room.</li>
        <li><b>Playground:</b> free play with an admin panel to hand out items, switch referees and bots between modes, set up penalties and end the match for a report. Press <kbd>\`</kbd> to hide the panel.</li>
        <li><b>Be the referee:</b> you control the referee. Press ${k('foul')} when you see a foul happen. ${k('pass')} turns ball tracking on and off, ${k('lpass')} and ${k('item')} turn your view, and holding ${k('shoot')} sprints. Correct, missed and wrong calls make up your rating.</li>
      </ul>`],
    ['g-tips', 'Stats and tips', `
      <h4>After the match</h4>
      <p>The full-time screen shows everyone's rating and the player of the match. Each match also produces a full report: ratings, discipline, sportsmanship, a timeline and balance notes. When the game runs on <code>server.py</code> it is saved to the <code>data-metric</code> folder automatically. Otherwise use the save buttons.</p>
      <h4>Tips</h4>
      <ul>
        <li>Check the cones before you foul. If one is red, you are being watched.</li>
        <li>Sand first, foul second: a blinded referee can't call anything.</li>
        <li>Save some charge for a power shot near goal.</li>
        <li>Helping players up builds trust, and a trusted player gets away with more.</li>
        <li>Low karma makes you a target. Expect revenge.</li>
      </ul>`],
    ['g-rough', 'Rough play, hazards and crates', `
      <ul>
        <li><b>Rage meter:</b> the bars beside the scoreboard. Tackles, shoves and fouls fill your team's. When it's full your whole team glows and your next hit or tackle is an <b>Overdrive</b>: double power and a shockwave that flattens everyone nearby. The catch: glowing players are spotted by referees from much further away.</li>
        <li><b>Character tackles</b> (${k('lpass')} without the ball): Brawler, Tank and Brawn <b>ground pound</b> (jump and slam: everyone close is knocked down). Hollow, Ranger and Trickster <b>lasso</b> someone from a short distance. Cinderwyrm and Striker slide on <b>fire</b>, leaving a scorch patch opponents hop off in panic. Bulwark slides on <b>ice</b>, leaving a slick that sends sprinters skidding. Everyone else slides as normal.</li>
        <li><b>Enforcers</b> (Brawler, Tank, Brawn, Bulwark) win more tackles and shrug off light shoves, but run slower and shoot less accurately. <b>Speedsters</b> (Speedster, Ronin, Shogun, Assassin) are quicker flat out and keep the ball closer, but a heavy hit sends them flying and keeps them down longer.</li>
        <li><b>Keepers:</b> foul one and they're knocked back toward their own net and drop the ball, but if a referee sees it, it's a straight red.</li>
        <li><b>VAR:</b> about to get a red? The match freezes for 3 seconds. Mash ${k('foul')} to argue it down to a yellow, or press ${k('item')} to bribe the referee with ${VAR.bribe} charge (a referee who likes you takes it more often).</li>
        <li><b>Dizzy:</b> players hit by a foul get up seeing stars and spin on the spot until they recover.</li>
        <li><b>Pitches</b> (on the match setup screen): Volcano (steam vents and lava pits: shove someone in and they're out for 10 seconds), Power Plant (electric fences), Swamp (mud).</li>
        <li><b>Crates</b> drop in when the match gets frantic. Run into one: a <b>volt ball</b> charges with hard kicks and tackles and explodes on the next player to touch it, an <b>iron ball</b> barely moves or bounces for 14 seconds.</li>
        <li><b>Bicycle kicks:</b> a high ball dropping into the box shows a red ring. Jump and strike it there for a shot the keeper can't hold.</li>
      </ul>`],
    ['g-credits', 'Credits', `
      <p>Foul Play FC uses these 3D models:</p>
      <ul>${Object.entries(CLASS_MODELS).filter(([, m]) => m.credit).map(([id, m]) => `<li><b>${esc((CLS[id] || {}).name || id)}:</b> ${esc(m.credit)}</li>`).join('') || '<li>None yet.</li>'}</ul>
      <p>3D rendering by three.js (MIT licence).</p>`]
  ];
}
function renderGuide() {
  const secs = guideSections(), nav = document.getElementById('guide-tabs'), body = document.getElementById('guide-body');
  nav.innerHTML = secs.map(([id, title]) => `<button role="tab" id="${id}" aria-controls="${id}-p" aria-selected="false" tabindex="-1">${title}</button>`).join('');
  body.innerHTML = secs.map(([id, title, html], i) => `<section class="guide-sec" id="${id}-p" role="tabpanel" aria-labelledby="${id}" hidden><h3>${title}</h3>${html}
    <div class="guide-nav">${i > 0 ? `<button class="btn ghost sm" data-go="${secs[i - 1][0]}">← ${secs[i - 1][1]}</button>` : '<span></span>'}${i < secs.length - 1 ? `<button class="btn ghost sm" data-go="${secs[i + 1][0]}">${secs[i + 1][1]} →</button>` : '<button class="btn sm" data-go="close">Start playing</button>'}</div></section>`).join('');
  if (!showGuideTab) showGuideTab = setupTabs(nav, body);
  body.querySelectorAll('[data-go]').forEach(b => b.onclick = () => { if (b.dataset.go === 'close') closeGuide(); else { guideTab = b.dataset.go; showGuideTab(guideTab); } });
  nav.addEventListener('click', e => { const t = e.target.closest('[role="tab"]'); if (t) guideTab = t.id; });
  showGuideTab(guideTab);
}
function openGuide(from) { guideFrom = from; renderGuide(); showOverlay('guide'); }
function closeGuide() { showOverlay(guideFrom); }
