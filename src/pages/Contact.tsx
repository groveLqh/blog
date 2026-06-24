import { FadeIn } from "@/components/helpers/FadeIn";
import { socials } from "@/data/socials";
import { useTheme } from "next-themes";
import { ArrowUpRight, ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { assetUrl } from "@/lib/assets";

const Contact = () => {
  const { resolvedTheme } = useTheme();
  const navigate = useNavigate();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col px-6 pb-8 pt-6 sm:pt-12 sm:pb-24 space-y-8">
      <FadeIn yOffset={10} duration={0.4}>
        <button
          onClick={() => navigate("/")}
          className="flex w-fit items-center gap-3 text-md font-light tracking-tight text-muted-foreground cursor-pointer duration-200 hover:text-foreground"
        >
          <ChevronLeft size={20} strokeWidth={2.25} /> Back to Home
        </button>
      </FadeIn>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 pt-4">
        {/* Left Side: Matter */}
        <div className="flex flex-col gap-10 justify-center">
          <FadeIn delay={0.1}>
            <h1 className="text-3xl font-light tracking-tight sm:text-4xl">
              一起交流
            </h1>
          </FadeIn>
          <FadeIn delay={0.15}>
            <p className="text-muted-foreground text-base sm:text-lg leading-relaxed">
              如果你也在关注 Agent、AI Coding、产品平台或技术组织，欢迎从
              GitHub 找到我。这里会持续沉淀我的文章和公开笔记。
            </p>
          </FadeIn>
        </div>

        {/* Right Side: Links */}
        <div className="flex flex-col gap-3 justify-center">
          {socials.map((social, index) => (
            <FadeIn key={social.name} delay={0.2 + index * 0.05}>
              <a
                href={social.href}
                target={social.href.startsWith("mailto") ? undefined : "_blank"}
                rel={
                  social.href.startsWith("mailto") ? undefined : "noreferrer"
                }
                className="group flex items-center justify-between rounded-xl border border-dashed border-border/80 bg-card p-4 transition-all hover:border-foreground/30 hover:bg-muted/20"
              >
                <div className="flex items-center gap-4">
                  <img
                    src={
                      resolvedTheme === "dark" && social.darkIcon
                        ? assetUrl(social.darkIcon)
                        : assetUrl(social.icon)
                    }
                    alt={social.name}
                    className="h-6 w-6 rounded-sm object-contain"
                  />
                  <span className="text-base font-light tracking-tight">
                    {social.name}
                  </span>
                </div>
                <ArrowUpRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground" />
              </a>
            </FadeIn>
          ))}
        </div>
      </div>
    </main>
  );
};

export default Contact;
