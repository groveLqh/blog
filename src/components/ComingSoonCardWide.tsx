import { BiLink } from "react-icons/bi";
import { LuGithub } from "react-icons/lu";

const ComingSoonCardWide = () => {
  return (
    <div className="col-span-1 sm:col-span-2 flex flex-col gap-3 bg-card border border-dashed border-border/80 p-4 sm:p-5 rounded-xl w-full overflow-hidden opacity-70">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1 min-w-0">
          <span className="text-lg sm:text-xl font-light tracking-tight text-foreground">
            Track Unknown
          </span>
          <p className="text-sm font-light leading-relaxed text-muted-foreground line-clamp-2">
            More notes and essays are being organized. Stay tuned for updates.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0 mt-0.5">
          <BiLink className="w-4 h-4 text-muted-foreground/50 cursor-not-allowed" />
          <LuGithub className="w-4 h-4 text-muted-foreground/50 cursor-not-allowed" />
        </div>
      </div>

      <div className="flex items-center gap-2 mt-1">
        {["Tech", "Stack", "Hidden"].map((label) => (
          <span
            key={label}
            className="text-[10px] font-mono text-muted-foreground uppercase bg-muted/50 px-2 py-0.5 rounded-md border border-border/50"
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
};

export default ComingSoonCardWide;
