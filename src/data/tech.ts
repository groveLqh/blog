export interface TechItem {
  name: string;
  icon: string;
  darkIcon?: string;
}

export const skills: TechItem[] = [
  { name: "React", icon: "/tech/react.svg" },
  { name: "TypeScript", icon: "/tech/typescript.svg" },
  { name: "Vite", icon: "/tech/vite.svg" },
  { name: "GitHub", icon: "/social/github.svg", darkIcon: "/social/github-dark.svg" },
  { name: "Node.js", icon: "/tech/nodejs-light.svg", darkIcon: "/tech/nodejs-dark.svg" },
];

export const frontendSkills: TechItem[] = [
  { name: "React", icon: "/tech/react.svg" },
  { name: "TypeScript", icon: "/tech/typescript.svg" },
  { name: "Tailwind CSS", icon: "/tech/tailwindcss.svg" },
  { name: "shadcn/ui", icon: "/tech/shadcn-ui-light.svg", darkIcon: "/tech/shadcn-ui-dark.svg" },
  { name: "Vite", icon: "/tech/vite.svg" },
  { name: "Framer Motion", icon: "/tech/motion.svg" },
];

export const backendSkills: TechItem[] = [
  { name: "Node.js", icon: "/tech/nodejs-light.svg", darkIcon: "/tech/nodejs-dark.svg" },
  { name: "TypeScript", icon: "/tech/typescript.svg" },
  { name: "Supabase", icon: "/tech/supabase.svg" },
  { name: "PostgreSQL", icon: "/tech/postgre.svg" },
  { name: "Redis", icon: "/tech/redis.svg" },
  { name: "Docker", icon: "/tech/docker.svg" },
];

export const toolsSkills: TechItem[] = [
  { name: "Git", icon: "/tech/git.svg" },
  { name: "GitHub", icon: "/social/github.svg", darkIcon: "/social/github-dark.svg" },
  { name: "Vercel", icon: "/tech/vercel-light.svg", darkIcon: "/tech/vercel-dark.svg" },
  { name: "NPM", icon: "/tech/npm.svg" },
  { name: "Bun", icon: "/tech/bun.svg", darkIcon: "/tech/bun-dark.svg" },
  { name: "HTML5", icon: "/tech/html5.svg" },
];

export const skillRows: {
  direction: "left" | "right";
  category: string;
  items: TechItem[];
}[] = [
  {
    direction: "left",
    category: "Frontend",
    items: frontendSkills,
  },
  {
    direction: "right",
    category: "Runtime",
    items: backendSkills,
  },
  {
    direction: "left",
    category: "Tools",
    items: toolsSkills,
  },
];

export const projectTech = {
  react: { name: "React", icon: "/tech/react.svg" },
  typescript: { name: "TypeScript", icon: "/tech/typescript.svg" },
  tailwindcss: { name: "Tailwind CSS", icon: "/tech/tailwindcss.svg" },
  vite: { name: "Vite", icon: "/tech/vite.svg" },
  motion: { name: "Framer Motion", icon: "/tech/motion.svg" },
  shadcnui: {
    name: "shadcn/ui",
    icon: "/tech/shadcn-ui-light.svg",
    darkIcon: "/tech/shadcn-ui-dark.svg",
  },
  nodejs: {
    name: "Node.js",
    icon: "/tech/nodejs-light.svg",
    darkIcon: "/tech/nodejs-dark.svg",
  },
  github: {
    name: "GitHub",
    icon: "/social/github.svg",
    darkIcon: "/social/github-dark.svg",
  },
  markdown: { name: "Markdown", icon: "/tech/html5.svg" },
} as const;
