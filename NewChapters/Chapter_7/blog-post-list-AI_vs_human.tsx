"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { type QueryDocumentSnapshot } from "firebase/firestore";
import { fetchPostsPage, PAGE_SIZE } from "@/lib/posts-query";
import { BlogPostItem, type BlogPost } from "@/components/blog-post-item";
import { BlogEmptyState } from "@/components/blog-empty-state";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Status = "loading-first" | "loading-more" | "idle" | "error";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BlogPostList() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [status, setStatus] = useState<Status>("loading-first");
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  // Cursor is the last DocumentSnapshot from the most-recent page fetch.
  // Using a ref avoids adding it to the effect dependency array and
  // prevents stale-closure bugs across sequential page loads.
  const cursorRef = useRef<QueryDocumentSnapshot | null>(null);

  // ------------------------------------------------------------------
  // Fetch helpers
  // ------------------------------------------------------------------

  const loadFirstPage = useCallback(async () => {
    setStatus("loading-first");
    setError(null);
    try {
      const page = await fetchPostsPage(null);
      setPosts(page.posts);
      cursorRef.current = page.nextCursor;
      setHasMore(page.nextCursor !== null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load posts.");
    } finally {
      setStatus("idle");
    }
  }, []);

  const loadNextPage = useCallback(async () => {
    if (status === "loading-more" || !hasMore) return;
    setStatus("loading-more");
    try {
      const page = await fetchPostsPage(cursorRef.current);
      setPosts((prev) => [...prev, ...page.posts]);
      cursorRef.current = page.nextCursor;
      setHasMore(page.nextCursor !== null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load more posts.",
      );
    } finally {
      setStatus("idle");
    }
  }, [status, hasMore]);

  // ------------------------------------------------------------------
  // Initial load
  // ------------------------------------------------------------------

  useEffect(() => {
    loadFirstPage();
  }, [loadFirstPage]);

  // ------------------------------------------------------------------
  // Render states
  // ------------------------------------------------------------------

  if (status === "loading-first") {
    return (
      <div
        className="flex flex-col"
        role="status"
        aria-label="Loading blog posts"
      >
        {Array.from({ length: PAGE_SIZE / 2 }).map((_, i) => (
          <div
            key={i}
            className="flex animate-pulse flex-col gap-3 border-b border-border py-8 last:border-b-0 md:flex-row md:items-baseline md:gap-12"
          >
            <div className="h-4 w-28 rounded bg-secondary" />
            <div className="flex flex-1 flex-col gap-2">
              <div className="h-6 w-3/4 rounded bg-secondary" />
              <div className="h-4 w-32 rounded bg-secondary" />
            </div>
          </div>
        ))}
        <span className="sr-only">Loading blog posts</span>
      </div>
    );
  }

  if (status === "idle" && posts.length === 0 && !error) {
    return <BlogEmptyState />;
  }

  if (status === "idle" && error && posts.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center py-24 text-center"
        role="alert"
      >
        <div className="mb-4 rounded-full bg-destructive/10 p-4">
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="text-destructive"
            aria-hidden="true"
          >
            <path
              d="M12 9v4m0 4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h2 className="text-lg font-medium text-foreground">
          Failed to load posts
        </h2>
        <p className="mt-1 max-w-sm text-sm leading-relaxed text-muted-foreground">
          {error}
        </p>
        <button
          type="button"
          onClick={loadFirstPage}
          className="mt-6 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <section aria-label="Blog posts">
      <div className="flex flex-col" role="feed">
        {posts.map((post) => (
          <BlogPostItem key={post.id} post={post} />
        ))}
      </div>

      {/* Inline error banner for paginated failures */}
      {error && (
        <p role="alert" className="mt-4 text-sm text-destructive">
          {error}
        </p>
      )}

      {hasMore && (
        <div className="mt-10 flex justify-center">
          <button
            type="button"
            onClick={loadNextPage}
            disabled={status === "loading-more"}
            aria-busy={status === "loading-more"}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-6 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
          >
            {status === "loading-more" ? (
              <>
                <svg
                  className="h-4 w-4 animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                  />
                </svg>
                Loading…
              </>
            ) : (
              "Load more"
            )}
          </button>
        </div>
      )}

      {!hasMore && posts.length > 0 && (
        <p className="mt-10 text-center text-sm text-muted-foreground">
          You have reached the end.
        </p>
      )}
    </section>
  );
}
