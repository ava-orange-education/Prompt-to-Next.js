"use client";


/**
 * AUDIT NOTES (Over-fetching & Rendering)
 * - Uses onSnapshot() for a public blog feed: keeps a live listener open and re-renders on any change.
 * - Query is unbounded (no limit/pagination): downloads the entire ordered collection as it grows.
 * - doc.data() spreads all fields into memory even though the UI renders only a subset.
 * - setPosts() replaces the whole array on every snapshot: can trigger full list re-render and degrade INP.
 * - Next steps: limit + cursor pagination, consider one-time getDocs() with caching/revalidation, and stabilize rendering.
 */
import { useEffect, useState } from "react";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  type FirestoreError,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { BlogPostItem, type BlogPost } from "@/components/blog-post-item";
import { BlogEmptyState } from "@/components/blog-empty-state";

export function BlogPostList() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    // AUDIT NOTE: No limit() and no pagination cursor → unbounded read.
    // For large collections this inflates payload size and client memory usage.

    const unsubscribe = onSnapshot(
      // AUDIT NOTE: Real-time subscription is usually unnecessary for a public feed.
      // It increases background network activity and can cause repeated renders.
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          // AUDIT NOTE: This pulls *all* fields from the document via doc.data().
          // Firestore doesn't support classic field-projection here; to reduce payload you often need a smaller feed doc shape.
          id: doc.id,
          ...doc.data(),
        })) as BlogPost[];
        setPosts(data);
        setLoading(false);
        setError(null);
      },
      (err: FirestoreError) => {
        setError(err.message);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div
        className="flex flex-col gap-8 py-8"
        role="status"
        aria-label="Loading blog posts"
      >
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col gap-3 border-b border-border py-8 md:flex-row md:items-baseline md:gap-12 last:border-b-0 animate-pulse"
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

  if (error) {
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
        <p className="mt-1 max-w-sm text-sm text-muted-foreground leading-relaxed">
          {error}
        </p>
      </div>
    );
  }

  if (posts.length === 0) {
    return <BlogEmptyState />;
  }

  return (
    <div className="flex flex-col" role="feed" aria-label="Blog posts">
      {posts.map((post) => (
        <BlogPostItem key={post.id} post={post} />
      ))}
    </div>
  );
}
