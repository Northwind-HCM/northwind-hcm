import { NextResponse } from "next/server";
import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function getFirebaseAdmin() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Firebase Admin ENV fehlt: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL oder FIREBASE_PRIVATE_KEY."
    );
  }

  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  }

  return {
    auth: getAuth(),
    db: getFirestore(),
  };
}

export async function POST(request: Request) {
  try {
    const { auth, db } = getFirebaseAdmin();

    const body = await request.json();
    const { uid } = body;

    if (!uid) {
      return NextResponse.json(
        { error: "uid ist erforderlich." },
        { status: 400 }
      );
    }

    await auth.deleteUser(uid);
    await db.collection("users").doc(uid).delete();

    return NextResponse.json({
      success: true,
      deletedUid: uid,
    });
  } catch (error: any) {
    console.error("Delete user error:", error);

    return NextResponse.json(
      {
        error: error.message || "Benutzer konnte nicht gelöscht werden.",
      },
      { status: 500 }
    );
  }
}