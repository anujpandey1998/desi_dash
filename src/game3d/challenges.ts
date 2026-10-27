export type InputAction = 'left' | 'right' | 'jump' | 'slide';
export type RunInput = { tick: number; action: InputAction };
export type Challenge = { code: string; seed: number; limit: number; expires: number };
export type Entry = { name: string; score: number; distance: number };
export type GhostRun = { seed: number; ticks: number; inputs: RunInput[] };
export type Ticket = { challenge: Challenge; token: string; ghost?: GhostRun };
export const CHALLENGE_VERSION = 1;
export function missionDay(now = new Date()) { return now.toISOString().slice(0, 10); }
export type MissionProgress = { day: string; runs: number; distance: number; coins: number; claimed: string[] };
export const MISSIONS = [
  { id: 'runs', title: 'Finish 3 runs', target: 3, reward: 75 },
  { id: 'distance', title: 'Travel 1,000 metres', target: 1000, reward: 100 },
  { id: 'coins', title: 'Collect 30 coins', target: 30, reward: 100 },
] as const;
export function freshMissions(): MissionProgress { return { day: missionDay(), runs: 0, distance: 0, coins: 0, claimed: [] }; }
