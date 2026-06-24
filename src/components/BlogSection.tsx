import { blogs } from "@/data/blog";
import BlogCard from "./BlogCard";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";

const BlogSection = () => {
  return (
    <section id="blogs" className="w-full space-y-6">
      <div className="flex gap-3">
        <p className="text-2xl font-light tracking-tight sm:text-3xl">
          Blogs
        </p>
      </div>
      <div className="flex flex-col gap-4">
        {blogs.map((blog) => (
          <BlogCard key={blog.title} {...blog} />
        ))}
      </div>
      <div className="flex justify-center pt-6">
        <Button asChild size="lg" className="text-base">
          <Link to="/blogs">
            View all Blogs
            <ChevronRight strokeWidth={2.25} />
          </Link>
        </Button>
      </div>
    </section>
  );
};

export default BlogSection;
