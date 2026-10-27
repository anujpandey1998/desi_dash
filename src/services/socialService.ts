import AsyncStorage from '@react-native-async-storage/async-storage';
import { CHALLENGE_VERSION, freshMissions, missionDay, type Challenge, type Entry, type MissionProgress, type RunInput, type Ticket, type WeeklyLeague } from '../game3d/challenges';
const prefix = 'rooftop.v1.';
export async function loadServer() { return (await AsyncStorage.getItem(prefix + 'server')) || ''; }
export async function saveServer(url: string) {
  const clean = url.trim().replace(/\/+$/, '');
  if (clean && !/^https?:\/\/[^\s]+$/.test(clean)) throw Error('Enter an http:// or https:// server address.');
  await AsyncStorage.setItem(prefix + 'server', clean);
}
export async function loadPlayerName() { return (await AsyncStorage.getItem(prefix + 'name')) || 'Courier'; }
export async function savePlayerName(name: string) {
  const clean = name.trim().slice(0, 20); if (!clean) throw Error('Enter a player name.');
  await AsyncStorage.setItem(prefix + 'name', clean);
}
async function api(path: string, body?: unknown) {
  const server = await loadServer(); if (!server) throw Error('Add your challenge server address below to play with friends.');
  const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(server + path, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined, signal: controller.signal });
    const data = await response.json(); if (!response.ok) throw Error(data.error || 'Challenge server unavailable.'); return data;
  } finally { clearTimeout(timeout); }
}
export async function createChallenge(): Promise<Challenge> { return api('/rooms', { version: CHALLENGE_VERSION }); }
export async function getChallenge(code: string): Promise<{ challenge: Challenge; entries: Entry[]; league: WeeklyLeague }> { return api('/rooms/' + encodeURIComponent(code.trim().toUpperCase())); }
export async function startChallenge(code: string): Promise<Ticket> { return api('/rooms/' + encodeURIComponent(code) + '/runs', { name: await loadPlayerName(), version: CHALLENGE_VERSION }); }
export async function submitChallenge(ticket: Ticket, ticks: number, inputs: RunInput[]) { await api('/rooms/' + ticket.challenge.code + '/results', { token: ticket.token, ticks, inputs }); }
let queue: Promise<unknown> = Promise.resolve();
export function localTransaction<T>(task: () => Promise<T>): Promise<T> { const next = queue.then(task, task); queue = next.catch(() => {}); return next; }
export async function loadMissions(): Promise<MissionProgress> {
  try { const saved = JSON.parse((await AsyncStorage.getItem(prefix + 'missions')) || 'null'); return saved?.day === missionDay() ? saved : freshMissions(); } catch { return freshMissions(); }
}
export async function recordDelivery(distance: number, coins: number) {
  const p = await loadMissions(); p.runs++; p.distance += Math.floor(distance); p.coins += coins;
  await AsyncStorage.setItem(prefix + 'missions', JSON.stringify(p));
}
export async function saveMissions(p: MissionProgress) { await AsyncStorage.setItem(prefix + 'missions', JSON.stringify(p)); }
export async function trackEvent(event: string, value = 1) {
  return localTransaction(async () => { const key = prefix + 'metrics', data = JSON.parse((await AsyncStorage.getItem(key)) || '{}'); data[event] = (data[event] || 0) + value; await AsyncStorage.setItem(key, JSON.stringify(data)); });
}

export async function saveCompletedRun(score: number, distance: number, coins: number, completed: boolean) {
  const p = await loadMissions();
  if (completed) { p.runs++; p.distance = Math.max(p.distance, Math.floor(distance)); p.coins += coins; }
  const best = Math.max(Number(await AsyncStorage.getItem('neon-dash.high-score.v1')) || 0, score);
  const wallet = (Number(await AsyncStorage.getItem('neon-dash.wallet-coins.v1')) || 0) + coins;
  await AsyncStorage.multiSet([['neon-dash.high-score.v1', String(best)], ['neon-dash.wallet-coins.v1', String(wallet)], [prefix + 'missions', JSON.stringify(p)]]);
  return { best, wallet };
}
export async function claimMission(id: typeof import('../game3d/challenges').MISSIONS[number]['id']) {
  const { MISSIONS } = require('../game3d/challenges') as typeof import('../game3d/challenges');
  return localTransaction(async () => {
    const p = await loadMissions(), m = MISSIONS.find(m => m.id === id)!;
    if (!m || p.claimed.includes(id) || p[id] < m.target) throw Error('Mission is not ready.');
    const wallet = (Number(await AsyncStorage.getItem('neon-dash.wallet-coins.v1')) || 0) + m.reward;
    p.claimed.push(id);
    await AsyncStorage.multiSet([['neon-dash.wallet-coins.v1', String(wallet)], [prefix + 'missions', JSON.stringify(p)]]);
    return p;
  });
}
