import { BALANCE } from '../content/balance';
import { fr } from '../content/i18n/fr';
import type { GameEvent, GameState } from '../core/state';
import type { Store } from '../core/store';
import { el } from './dom';
import { icon, type IconName } from './icons';
import { pulse } from './motion';

function stat(name: IconName, label: string, cls: string): { node: HTMLElement; value: HTMLElement } {
  const node = el('div', `stat ${cls}`);
  node.title = label;
  const value = el('span', 'stat-value');
  node.append(icon(name), value);
  return { node, value };
}

function eventText(e: GameEvent): string {
  switch (e.type) {
    case 'gold': return fr.events.gold(e.amount);
    case 'heal': return fr.events.heal(e.amount);
    case 'damage': return fr.events.damage(e.amount);
    case 'clover': return fr.events.clover(e.amount);
    case 'forge': return fr.events.forge(e.from, e.to);
    case 'karmaGain': return fr.events.karmaGain;
    case 'karmaUsed': return fr.events.karmaUsed;
    case 'enemyHit': return `${fr.events.enemyHit(e.amount)}${e.combo > 1 ? ` (${fr.combat.combo(e.combo)})` : ''}`;
    case 'enemyAttack': return fr.events.enemyAttack(e.roll, e.blocked);
    case 'enemyDown': return fr.events.enemyDown(fr.monsters[e.id]);
    case 'fled': return fr.events.fled(e.success);
    case 'trap': return fr.events.trap(e.success);
    case 'card': return fr.events.card(fr.cards.names[e.card] ?? String(e.card), e.success);
    case 'loot': return e.rarity === 'skull' ? fr.loot.skull : `${fr.loot.rarity[e.rarity]} : ${fr.loot.kind[e.kind]} ${e.amount}`;
    case 'room': return fr.rooms[e.room];
  }
}

const GOOD: ReadonlySet<GameEvent['type']> = new Set(['gold', 'heal', 'clover', 'forge', 'karmaUsed', 'enemyDown']);

/** Barre de ressources (PV, Or, Trèfles, Karma, étage) et fil des événements. */
export function mountHud(store: Store, seedLabel: () => string): { node: HTMLElement; dispose: () => void } {
  const bar = el('div', 'stats');
  const hp = stat('heart', fr.hud.hp, 'stat-hp');
  const gold = stat('piggyBank', fr.hud.gold, 'stat-gold');
  const clovers = stat('sparkles', fr.hud.clovers, 'stat-clovers');
  const karma = stat('star', fr.hud.karma, 'stat-karma');
  const gauge = el('span', 'karma-gauge');
  const pips = Array.from({ length: BALANCE.karma.max }, () => el('i'));
  gauge.append(...pips);
  karma.value.replaceWith(gauge);
  const depth = el('div', 'stat stat-depth');
  bar.append(hp.node, gold.node, clovers.node, karma.node, depth);
  const feed = el('div', 'feed');
  feed.setAttribute('aria-live', 'polite');
  const seed = el('div', 'seed-tag');
  const node = el('div', 'hud-stats');
  node.append(bar, feed, seed);

  function render(state: GameState, prev: GameState | null): void {
    const h = state.hero;
    hp.value.textContent = `${h.hp}/${h.maxHp}`;
    gold.value.textContent = String(h.gold);
    clovers.value.textContent = String(h.clovers);
    pips.forEach((p, i) => p.classList.toggle('on', i < h.karma));
    karma.node.classList.toggle('full', h.karma >= BALANCE.karma.max);
    karma.node.title = h.karma >= BALANCE.karma.max ? fr.hud.karmaFull : fr.hud.karma;
    depth.textContent = fr.hud.depth(state.depth, BALANCE.floor.count);
    seed.textContent = seedLabel();
    if (prev) {
      if (prev.hero.hp !== h.hp) void pulse(hp.node);
      if (prev.hero.gold !== h.gold) void pulse(gold.node);
      if (prev.hero.clovers !== h.clovers) void pulse(clovers.node);
      if (prev.hero.karma !== h.karma) void pulse(karma.node);
    }
    for (const e of state.events) {
      const item = el('div', `feed-item${GOOD.has(e.type) ? ' good' : e.type === 'damage' || e.type === 'karmaGain' ? ' bad' : ''}`, eventText(e));
      feed.prepend(item);
      item.animate([{ opacity: 0, transform: 'translateY(-6px)' }, { opacity: 1, transform: 'none' }], { duration: 200, easing: 'ease-out' });
      setTimeout(() => {
        const out = item.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, easing: 'ease-out', fill: 'forwards' });
        out.finished.then(() => item.remove(), () => item.remove());
      }, 3200);
    }
    while (feed.childElementCount > 5) feed.lastElementChild?.remove();
  }

  render(store.getState(), null);
  const unsubscribe = store.subscribe((s, p) => render(s, p));
  return { node, dispose: unsubscribe };
}
