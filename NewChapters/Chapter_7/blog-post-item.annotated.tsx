import type { Timestamp } from "firebase/firestore";

export interface BlogPost {

/**
 * AUDIT NOTES (UI Stability)
 * - List items are light, but in real feeds you often add images. Without reserved dimensions/aspect ratio,
 *   LCP and CLS degrade quickly. Keep this in mind when extending the component.
 * - formatDate() runs per render; for long lists, consider memoization or pre-formatting at fetch time.
 */
  id: string;
  title: string;
  authorName: string;
  createdAt: Timestamp | { seconds: number; nanoseconds: number };
}

function formatDate(
  ts: Timestamp | { seconds: number; nanoseconds: number },
): string {
  const date =
    "toDate" in ts && typeof ts.toDate === "function"
      ? ts.toDate()
      : new Date(ts.seconds * 1000);

  // AUDIT NOTE: Date formatting is relatively expensive when repeated across large lists.
  // Consider caching formatted values or formatting server-side when appropriate.
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function BlogPostItem({ post }: { post: BlogPost }) {
  return (
    <article className="group flex flex-col gap-3 border-b border-border py-8 md:flex-row md:items-baseline md:gap-12 last:border-b-0">
      <time
        className="shrink-0 text-sm font-mono tracking-wide text-muted-foreground uppercase md:w-36"
        dateTime={
          "toDate" in post.createdAt &&
          typeof post.createdAt.toDate === "function"
            ? post.createdAt.toDate().toISOString()
            : new Date(post.createdAt.seconds * 1000).toISOString()
        }
      >
        {formatDate(post.createdAt)}
      </time>

      <div className="flex flex-1 flex-col gap-1">
        <h2 className="text-xl font-medium leading-snug text-foreground text-balance md:text-2xl">
          {post.title}
        </h2>
        <p className="text-sm text-muted-foreground">{post.authorName}</p>
      </div>

      <span
        className="hidden shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-1 md:block"
        aria-hidden="true"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M4.167 10h11.666M10.833 5l5 5-5 5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </article>
  );
}