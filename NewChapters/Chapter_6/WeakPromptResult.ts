import { db } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

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

    if (!snapshot.exists) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    return NextResponse.json(
      { profile: { id: snapshot.id, ...snapshot.data() } },
      { status: 200 }
    );
  } catch (err) {
    console.error("[profile] Firestore update failed:", err);
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
