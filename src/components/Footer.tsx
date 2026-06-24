import VisitorCount from "./VisitorCount";
import { site } from "@/data/site";

const Footer = () => {
  return (
    <div className="mx-auto w-full max-w-3xl px-6 pb-12 sm:pb-14">
      <footer className="flex flex-col items-center gap-4 border-t border-dashed border-border/80 pt-8 text-sm sm:flex-row sm:items-end sm:justify-between sm:gap-6">
        <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
          <span className="text-base text-muted-foreground">Designed from CharanMunur/Portfolio, adapted by</span>
          <span className="text-base font-light tracking-tight text-foreground">
            {site.name}
          </span>
        </p>
        <div className="sm:shrink-0">
          <VisitorCount />
        </div>
      </footer>
    </div>
  );
};

export default Footer;
