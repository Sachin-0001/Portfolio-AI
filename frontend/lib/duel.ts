// Shapes returned by the backend's POST /api/duel (see backend/duel/judge.py).

export type Side = 'challenger' | 'sachin';
export type Winner = Side | 'tie' | 'draw';

export interface GithubStats {
  username: string;
  avatar_url: string;
  profile_url: string;
  followers: number;
  original_repos: number;
  stars: number;
  forks: number;
  active_repos_90d: number;
  account_age_years: number;
  top_languages: [string, number][];
  top_repos: { name: string; stars: number; language: string | null; url: string }[];
  contributions_last_year: number | null;
}

export interface FighterCard {
  name: string;
  headline: string;
  github: GithubStats | null;
  stats: {
    experience_months: number;
    roles: number;
    projects: number;
    skills: number;
    achievements: number;
  };
  education: { institution: string; degree: string; score: string; end: string }[];
}

export interface RoundSide {
  score: number;
  evidence: string[];
}

export interface Round {
  key: string;
  title: string;
  subtitle: string;
  challenger: RoundSide;
  sachin: RoundSide;
  winner: Side | 'tie';
  commentary: string;
}

export interface DuelResult {
  fighters: Record<Side, FighterCard>;
  rounds: Round[];
  totals: Record<Side, number>;
  winner: Side | 'draw';
  decision: 'ko' | 'decision' | 'draw';
  announcer: string;
  learn: { challenger_from_sachin: string; sachin_from_challenger: string };
  skills: { shared: string[]; only_challenger: string[]; only_sachin: string[] };
  github_lookup: { username: string | null; found: boolean };
}

export type DuelEvent =
  | { stage: 'reading' }
  | { stage: 'github'; username: string | null }
  | { stage: 'judging'; challenger: string }
  | { stage: 'done'; result: DuelResult }
  | { stage: 'error'; message: string };

export const firstName = (name: string) => name.trim().split(/\s+/)[0] || name;

export const SIDE_COLOR: Record<Side, string> = {
  challenger: 'var(--signal)',
  sachin: 'var(--accent)',
};
