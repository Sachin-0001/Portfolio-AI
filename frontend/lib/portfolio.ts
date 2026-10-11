// Typed view over data/portfolio.json.
// The backend's portfolio_data.json is the source of truth; run `npm run sync:data` after editing it.
import raw from "@/data/portfolio.json";

export interface Profile {
  name: string;
  title: string;
  headline: string;
  summary: string;
  location: string;
  email: string;
  status: string;
  resume_url: string;
}

export interface Education {
  institution: string;
  degree: string;
  cgpa: string;
  start_date: string;
  end_date: string;
  location: string;
}

export interface Experience {
  company: string;
  role: string;
  start_date: string;
  end_date?: string;
  mode?: string;
  link?: string;
  description: string;
  highlights?: string[];
  tags?: string[];
}

export interface Project {
  id: number;
  name: string;
  tagline?: string;
  description: string;
  highlights?: string[];
  tags: string[];
  date?: string;
  featured?: boolean;
  link?: string;
  github?: string;
  npm?: string;
}

export interface SkillGroup {
  category: string;
  items: string[];
}

export interface Achievement {
  title: string;
  description: string;
  date: string;
}

export interface Social {
  platform: string;
  link: string;
}

export interface Portfolio {
  profile: Profile;
  education: Education[];
  experience: Experience[];
  projects: Project[];
  skill_groups: SkillGroup[];
  skills: string[];
  achievements: Achievement[];
  socials: Social[];
}

export const portfolio = raw as Portfolio;
