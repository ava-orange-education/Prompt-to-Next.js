import { db } from "@/lib/firebase";
import { verifyFirebaseToken } from "@/lib/verify-firebase-token";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Consistent error envelope
// ---------------------------------------------------------------------------
interface ApiError {
  error: string;
  details?: unknown;
}

function errorResponse(status: number, error: string, details?: unknown) {
  const body: ApiError = { error };
  if (details !== undefined) body.details = details;
  return NextResponse.json(body, { status });
}

// ---------------------------------------------------------------------------
// Validation schema — all fields optional for PATCH semantics
// ---------------------------------------------------------------------------
const updateProfileSchema = z
  .object({
    displayName: z.string().min(1).max(100).optional(),
    bio: z.string().max(500).optional(),
    avatarUrl: z.string().url().optional(),
    location: z.string().max(100).optional(),
    website: z.string().url().optional(),
  })
  .strict(); // reject unknown keys

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extract and validate the Bearer token from the Authorization header. */
function extractBearerToken(request: NextRequest): string | null {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice(7).trim();
  return token.length > 0 ? token : null;
}

/** Authenticate the caller and return their UID, or an error response. */
async function authenticate(request: NextRequest) {
  const idToken = extractBearerToken(request);
  if (!idToken) {
    return {
      uid: null as never,
      error: errorResponse(
        401,
        "Missing or malformed Authorization header. Expected: Bearer <idToken>",
      ),
    };
  }

  try {
    const decoded = await verifyFirebaseToken(idToken);
    return { uid: decoded.uid, error: null };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Token verification failed.";
    return {
      uid: null as never,
      error: errorResponse(401, `Invalid ID token: ${message}`),
    };
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/profile — update the authenticated user's profile
// ---------------------------------------------------------------------------
export async function PATCH(request: NextRequest) {
  // 1. Authenticate
  const auth = await authenticate(request);
  if (auth.error) return auth.error;

  // 2. Parse JSON defensively
  let body: unknown;
  try {
    const text = await request.text();
    if (text.trim().length === 0) {
      return errorResponse(400, "Request body is empty.");
    }
    body = JSON.parse(text);
  } catch {
    return errorResponse(400, "Request body contains invalid JSON.");
  }

  // 3. Validate with Zod
  const parsed = updateProfileSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(
      422,
      "Validation failed.",
      parsed.error.flatten().fieldErrors,
    );
  }

  const updates = parsed.data;

  // 4. Reject truly empty payloads (all optional fields omitted)
  if (Object.keys(updates).length === 0) {
    return errorResponse(
      400,
      "Payload must include at least one updatable field.",
    );
  }

  // 5. Write to Firestore
  try {
    const docRef = doc(db, "users", auth.uid);

    await setDoc(
      docRef,
      {
        ...updates,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );

    const snapshot = await getDoc(docRef);

    if (!snapshot.exists()) {
      return errorResponse(404, "User profile not found after write.");
    }

    return NextResponse.json(
      { profile: { id: snapshot.id, ...snapshot.data() } },
      { status: 200 },
    );
  } catch (err) {
    console.error("[profile] Firestore update failed:", err);
    return errorResponse(500, "Failed to update profile. Please try again.");
  }
}

// ---------------------------------------------------------------------------
// GET /api/profile — fetch the authenticated user's profile
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  const auth = await authenticate(request);
  if (auth.error) return auth.error;

  try {
    const snapshot = await getDoc(doc(db, "users", auth.uid));

    if (!snapshot.exists()) {
      return errorResponse(404, "User profile not found.");
    }

    return NextResponse.json(
      { profile: { id: snapshot.id, ...snapshot.data() } },
      { status: 200 },
    );
  } catch (err) {
    console.error("[profile] Firestore fetch failed:", err);
    return errorResponse(500, "Failed to fetch profile. Please try again.");
  }
}
