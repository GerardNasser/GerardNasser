import projectsData from './projects.json';

export type ProjectCategory = 'app' | 'research' | 'side';

export type Project = {
  name: string;
  category: ProjectCategory;
  blurb: string;
  stack: string[];
  status: 'active' | 'stable' | 'early';
  href: string;
  base?: string; // nucleotide accent: a | t | g | c
};

export const projects: Project[] = projectsData.projects as Project[];

export const projectsByCategory = (category: ProjectCategory): Project[] =>
  projects.filter((p) => p.category === category);
