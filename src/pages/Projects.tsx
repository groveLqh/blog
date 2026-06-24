import ProjectCard from "@/components/ProjectCard";
import ComingSoonCard from "@/components/ComingSoonCard";
import { projects } from "@/data/projects";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { FadeIn } from "@/components/helpers/FadeIn";

const Projects = () => {
  const navigate = useNavigate();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col px-6 pt-6 pb-8 sm:pt-12 sm:pb-12 space-y-6">
      <FadeIn yOffset={10} duration={0.4}>
        <button
          onClick={() => navigate("/")}
          className="flex w-fit items-center gap-3 text-md font-light tracking-tight text-muted-foreground cursor-pointer duration-200 hover:text-foreground"
        >
          <ChevronLeft size={20} strokeWidth={2.25} /> Back to Home
        </button>
      </FadeIn>
      <FadeIn
        delay={0.1}
        yOffset={15}
        duration={0.5}
        className="flex flex-col gap-2"
      >
        <h1 className="text-2xl font-light tracking-tight sm:text-3xl">
          All Tracks
        </h1>
        <p className="text-muted-foreground font-light text-lg">
          The main writing tracks behind this site: Agent systems, AI native
          software, and systems essays across technology and organizations.
        </p>
      </FadeIn>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-8 mt-6">
        {projects.map((project, idx) => (
          <FadeIn key={project.name} delay={0.15 + idx * 0.05} yOffset={20}>
            <ProjectCard {...project} />
          </FadeIn>
        ))}
        <FadeIn delay={0.15 + projects.length * 0.05} yOffset={20}>
          <ComingSoonCard />
        </FadeIn>
      </div>
    </main>
  );
};

export default Projects;
