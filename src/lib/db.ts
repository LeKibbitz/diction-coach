import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type {
  UserProfile,
  SessionResult,
  ExerciseProgress,
  SpeedTestResult,
} from "./types";

interface DictionCoachDB extends DBSchema {
  users: {
    key: string;
    value: UserProfile;
  };
  sessions: {
    key: string;
    value: SessionResult;
    indexes: {
      "by-exercise": string;
      "by-user": string;
      "by-date": number;
    };
  };
  progress: {
    key: string;
    value: ExerciseProgress;
    indexes: {
      "by-exercise": string;
      "by-user": string;
    };
  };
  speedTests: {
    key: string;
    value: SpeedTestResult;
    indexes: {
      "by-user": string;
      "by-date": number;
    };
  };
}

let dbInstance: IDBPDatabase<DictionCoachDB> | null = null;

export async function getDB(): Promise<IDBPDatabase<DictionCoachDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<DictionCoachDB>("diction-coach", 1, {
    upgrade(db) {
      // Users store
      db.createObjectStore("users", { keyPath: "id" });

      // Sessions store
      const sessionsStore = db.createObjectStore("sessions", {
        keyPath: "id",
      });
      sessionsStore.createIndex("by-exercise", "exerciseId");
      sessionsStore.createIndex("by-user", "userId");
      sessionsStore.createIndex("by-date", "completedAt");

      // Progress store
      const progressStore = db.createObjectStore("progress", {
        keyPath: "id",
      });
      progressStore.createIndex("by-exercise", "exerciseId");
      progressStore.createIndex("by-user", "userId");

      // Speed tests store
      const speedStore = db.createObjectStore("speedTests", {
        keyPath: "id",
      });
      speedStore.createIndex("by-user", "userId");
      speedStore.createIndex("by-date", "completedAt");
    },
  });

  return dbInstance;
}

// ─── User ───

export async function getUser(): Promise<UserProfile | undefined> {
  const db = await getDB();
  const all = await db.getAll("users");
  return all[0]; // single user app
}

export async function saveUser(user: UserProfile): Promise<void> {
  const db = await getDB();
  await db.put("users", user);
}

// ─── Sessions ───

export async function saveSession(session: SessionResult): Promise<void> {
  const db = await getDB();
  await db.put("sessions", session);
}

export async function getSessionsByExercise(
  exerciseId: string
): Promise<SessionResult[]> {
  const db = await getDB();
  return db.getAllFromIndex("sessions", "by-exercise", exerciseId);
}

export async function getSessionsByUser(
  userId: string
): Promise<SessionResult[]> {
  const db = await getDB();
  return db.getAllFromIndex("sessions", "by-user", userId);
}

export async function getSession(
  id: string
): Promise<SessionResult | undefined> {
  const db = await getDB();
  return db.get("sessions", id);
}

export async function getRecentSessions(
  limit: number = 20
): Promise<SessionResult[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex("sessions", "by-date");
  return all.slice(-limit).reverse();
}

// ─── Progress ───

export async function getProgress(
  exerciseId: string,
  userId: string
): Promise<ExerciseProgress | undefined> {
  const db = await getDB();
  return db.get("progress", `${exerciseId}::${userId}`);
}

export async function saveProgress(progress: ExerciseProgress): Promise<void> {
  const db = await getDB();
  await db.put("progress", progress);
}

export async function getAllProgress(
  userId: string
): Promise<ExerciseProgress[]> {
  const db = await getDB();
  return db.getAllFromIndex("progress", "by-user", userId);
}

// ─── Speed Tests ───

export async function saveSpeedTest(result: SpeedTestResult): Promise<void> {
  const db = await getDB();
  await db.put("speedTests", result);
}

export async function getSpeedTests(
  userId: string
): Promise<SpeedTestResult[]> {
  const db = await getDB();
  return db.getAllFromIndex("speedTests", "by-user", userId);
}
