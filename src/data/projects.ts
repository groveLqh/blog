import { projectTech } from "@/data/tech";
import type { TechItem } from "@/data/tech";
import { site } from "@/data/site";

export interface Project {
  name: string;
  imgSrc: string;
  description: string;
  techStack: TechItem[];
  liveLink: string;
  githubLink: string;
  about: string;
  features: string[];
}

export const projects: Project[] = [
  {
    name: "Agent Notes",
    imgSrc: "/projects/shrtn.png",
    description:
      "围绕 Agent Runtime、MCP、A2A、工具调用、状态和反思机制的系统化文章。",
    about:
      "这组内容从面试知识点和工程实践出发，拆解 Agent 为什么需要规划、状态、工具、反馈、Memory 和 Runtime。它更像一个持续更新的 Agent 系统设计笔记库。",
    features: [
      "Agent 基础概念、生命周期和运行闭环",
      "MCP、A2A、ACP、Tool Use 等工程边界",
      "AI Coding 与 Browser Use/Computer Use 的实践观察",
      "适合沉淀为面试、培训和产品方案材料",
    ],
    techStack: [
      projectTech.typescript,
      projectTech.markdown,
      projectTech.github,
      projectTech.vite,
    ],
    liveLink: "/blogs",
    githubLink: site.repoUrl,
  },
  {
    name: "AI Native Writing",
    imgSrc: "/projects/markdowneditor.png",
    description:
      "关于 AI 原生软件、数字员工、企业 Agent 和产品平台化的长期观察。",
    about:
      "这组文章关注 AI 能力进入真实软件和组织后的变化：哪些只是聊天入口，哪些才是可执行、可治理、可验证的 AI Native 系统。",
    features: [
      "数字员工与企业 Agent 的产品化路径",
      "AI Native Software 的对象、状态和操作设计",
      "从工程工具走向组织协作的系统思考",
      "连接产品、平台和商业判断",
    ],
    techStack: [
      projectTech.react,
      projectTech.typescript,
      projectTech.shadcnui,
      projectTech.motion,
    ],
    liveLink: "/blogs",
    githubLink: site.repoUrl,
  },
  {
    name: "Systems Essays",
    imgSrc: "/projects/supertodo.png",
    description:
      "技术、组织、产业和认知之间的交叉写作，记录判断如何形成。",
    about:
      "这些文章不只讨论技术实现，也讨论组织如何定义问题、技术人如何形成长期价值，以及产业周期如何改变软件公司的投入逻辑。",
    features: [
      "技术人与组织价值的长期表达",
      "产业与投资视角下的 AI 基建观察",
      "产品平台、团队协作和认知演化",
      "从具体工程问题延伸到系统判断",
    ],
    techStack: [
      projectTech.markdown,
      projectTech.nodejs,
      projectTech.tailwindcss,
      projectTech.github,
    ],
    liveLink: "/blogs",
    githubLink: site.repoUrl,
  },
];
