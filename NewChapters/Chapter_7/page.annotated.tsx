import type { Metadata } from "next";
import { BlogPostList } from "@/components/blog-post-list";

/**
 * AUDIT NOTES (Performance Baseline)
 * - This page delegates all data loading to a client component (BlogPostList).
 * - In the baseline AI output, this usually implies client-side fetching + real-time subscription, which can
 *   hurt Core Web Vitals (TTFB/LCP) and increase network + render work as the dataset grows.
 * - In later steps we will consider server-side fetching, pagination, and caching/revalidation.
 */

export const metadata: Metadata = {
  title: "Blog",
  description: "Read our latest blog posts and articles.",
};

export default function BlogPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 md:py-24">
      <header className="mb-12">
        <h1 className="text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
          Blog
        </h1>
        <p className="mt-3 text-base text-muted-foreground leading-relaxed">
          Thoughts, stories, and ideas.
        </p>
      </header>

      <BlogPostList />
    </main>
  );
}