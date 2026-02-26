import { db } from "@/lib/firebase-admin"; 
// AUDIT NOTE: Uses Firebase Admin SDK. Our Chapter 6 constraints prefer Firestore client SDK
// to align with v0-style setup and reduce configuration complexity.

import { FieldValue } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

/**
 * What this code does:
 * - Provides GET and PATCH handlers for /api/users/[userId]/profile.
 * - PATCH validates input using Zod and writes partial updates to Firestore (merge semantics).
 * - GET fetches the user profile document and returns it as JSON.
 *
 * Why this "works" in a demo:
 * - Valid JSON updates the target document and returns a profile snapshot.
 *
 * What we will audit:
 * - Authorization boundary (who is allowed to update which user)
 * - Stack alignment with our book constraints (Admin SDK vs client SDK)
 * - Response contract consistency for UI stability
 * - Abuse resistance (rate limiting / request limits)
 */

// ---------------------------------------------------------------------------
// Validation schema
// All fields are optional so callers can do partial updates (PATCH semantics).
// ---------------------------------------------------------------------------
const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  bio: z.string().max(500).optional(),
  avatarUrl: z.string().url().optional(),
  location: z.string().max(100).optional(),
  website: z.string().url().optional(),
});

// ---------------------------------------------------------------------------
// PATCH /api/users/[userId]/profile
// ---------------------------------------------------------------------------
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  // AUDIT NOTE: The route trusts userId from the URL without any auth check.
  // This is the main production blocker: anyone who can hit this endpoint can update arbitrary profiles.

  // -- Parse & validate request body ----------------------------------------
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON in request body." },
      { status: 400 }
    );
  }

  const parsed = updateProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed.", details: parsed.error.flatten() },
      { status: 422 }
      // AUDIT NOTE: 422 is acceptable, but many teams standardize on 400 for validation.
      // More important: we should standardize the overall error contract shape across all errors.
    );
  }

  const updates = parsed.data;

  // Reject empty payloads early
  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "At least one field must be provided." },
      { status: 400 }
    );
  }

  // -- Write to Firestore ----------------------------------------------------
  try {
    const docRef = db.collection("users").doc(userId);
    // AUDIT NOTE: No authorization boundary here. Even if Firestore rules exist,
    // server routes should enforce intent explicitly (e.g., session user must match userId).

    // merge: true ensures we don't overwrite fields that are not in the payload
    await docRef.set(
      {
        ...updates,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    // Return the latest snapshot so the client has the persisted data
    const snapshot = await docRef.get();
    // AUDIT NOTE: This read-after-write pattern can introduce subtle inconsistencies under concurrency.
    // Not catastrophic for profiles, but relevant as a general pattern.

    if (!snapshot.exists) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    return NextResponse.json(
      { profile: { id: snapshot.id, ...snapshot.data() } },
      { status: 200 }
      // AUDIT NOTE: Success shape is { profile: ... } but errors are { error: ... }.
      // That is fine, but teams often formalize a stable envelope to simplify UI handling.
    );
  } catch (err) {
    console.error("[profile] Firestore update failed:", err);
    // AUDIT NOTE: Console logging is better than nothing, but production often uses structured logs.

    return NextResponse.json(
      { error: "Failed to update profile. Please try again." },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// GET /api/users/[userId]/profile
// ---------------------------------------------------------------------------
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  // AUDIT NOTE: Same auth issue applies: anyone can fetch any profile by userId.

  try {
    const snapshot = await db.collection("users").doc(userId).get();

    if (!snapshot.exists) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    return NextResponse.json(
      { profile: { id: snapshot.id, ...snapshot.data() } },
      { status: 200 }
    );
  } catch (err) {
    console.error("[profile] Firestore fetch failed:", err);
    return NextResponse.json(
      { error: "Failed to fetch profile. Please try again." },
      { status: 500 }
    );
  }
}