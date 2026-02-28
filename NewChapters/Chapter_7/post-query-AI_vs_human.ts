/**
 * posts-query.ts
 *
 * Canonical query builder for the public blog feed.
 *
 * COMPOSITE INDEX REQUIRED (see firestore.indexes.json):
 *   Collection : posts
 *   Fields     : status ASC, createdAt DESC
 *
 * Why this shape scales to 100 k+ documents
 * ------------------------------------------
 * 1. Firestore charges per *document read*, not per collection scan.
 *    Without `where("status", "==", "published")`, every draft and
 *    deleted post is read and billed even though it is discarded.
 *
 * 2. A composite index on (status ASC, createdAt DESC) lets Firestore
 *    satisfy the equality filter AND the sort in a single index scan.
 *    Without it the SDK throws a "requires an index" error at runtime.
 *
 * 3. `limit(PAGE_SIZE)` restricts every round-trip to exactly 10 reads.
 *    Offset-based pagination (skip N) forces Firestore to read and
 *    discard the skipped documents — O(N) cost per page. Cursor-based
 *    pagination is O(PAGE_SIZE) regardless of how deep the user pages.
 *
 * 4. `startAfter(cursor)` receives the last DocumentSnapshot from the
 *    previous page. Firestore uses the indexed values inside that
 *    snapshot to resume the scan with zero wasted reads.
 */

import {
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  type DocumentSnapshot,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { BlogPost } from "@/components/blog-post-item";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const PAGE_SIZE = 10;

/** The value stored in `posts.status` for live posts. */
export const PUBLISHED_STATUS = "published" as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PostsPage {
  posts: BlogPost[];
  /** Pass this to `fetchPostsPage` as `cursor` to get the next page.
   *  `null` means there are no more pages. */
  nextCursor: QueryDocumentSnapshot | null;
}

// ---------------------------------------------------------------------------
// Query builder
// ---------------------------------------------------------------------------

/**
 * Fetches one page of published posts ordered newest-first.
 *
 * @param cursor - The last DocumentSnapshot from the previous page, or
 *                 `null` / `undefined` to start from the beginning.
 *
 * Usage — first page:
 *   const page = await fetchPostsPage();
 *
 * Usage — subsequent pages:
 *   const page2 = await fetchPostsPage(page.nextCursor);
 */
export async function fetchPostsPage(
  cursor?: DocumentSnapshot | null,
): Promise<PostsPage> {
  // Base constraints: equality filter first, then sort.
  // This ordering matches the composite index field order.
  const constraints = [
    where("status", "==", PUBLISHED_STATUS),
    orderBy("createdAt", "desc"),
    limit(PAGE_SIZE),
  ];

  // Append the cursor only when paginating past the first page.
  // startAfter() is exclusive — the cursor document itself is not returned.
  if (cursor) {
    constraints.push(startAfter(cursor));
  }

  const q = query(collection(db, "posts"), ...constraints);
  const snapshot = await getDocs(q);

  const posts = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<BlogPost, "id">),
  }));

  // If we received fewer documents than PAGE_SIZE we have exhausted the
  // collection — signal that to the caller so it can hide "Load more".
  const lastDoc = snapshot.docs[snapshot.docs.length - 1] ?? null;
  const nextCursor = snapshot.docs.length === PAGE_SIZE ? lastDoc : null;

  return { posts, nextCursor };
}
