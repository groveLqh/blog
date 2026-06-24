import { cn } from "@/lib/utils";
import { assetUrl } from "@/lib/assets";

type SocialIconProps = {
  icon: string;
  darkIcon?: string;
  alt: string;
  className?: string;
};

const SocialIcon = ({ icon, darkIcon, alt, className }: SocialIconProps) => {
  return (
    <span className="relative inline-flex shrink-0">
      <img
        src={assetUrl(icon)}
        alt={alt}
        loading="lazy"
        className={cn("block", className, darkIcon ? "dark:hidden" : "")}
      />
      {darkIcon ? (
        <img
          src={assetUrl(darkIcon)}
          alt={alt}
          loading="lazy"
          className={cn("hidden", className, "dark:block")}
        />
      ) : null}
    </span>
  );
};

export default SocialIcon;
