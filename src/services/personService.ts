import { getDb, Person, now, genUuid } from '../db/database';
import type { SQLiteBindParams } from 'expo-sqlite';

export function getPeople(includeArchived = false): Person[] {
  const database = getDb();
  const q = includeArchived
    ? `SELECT * FROM people WHERE deletedAt IS NULL ORDER BY name`
    : `SELECT * FROM people WHERE deletedAt IS NULL AND isArchived = 0 ORDER BY name`;
  return database.getAllSync<Person>(q);
}

export function getPerson(id: number): Person | null {
  const database = getDb();
  return database.getFirstSync<Person>('SELECT * FROM people WHERE id = ?', [id]);
}

export function createPerson(input: {
  name: string;
  phone?: string;
  email?: string;
  identification?: string;
  notes?: string;
}): Person {
  const database = getDb();
  const t = now();
  const uuid = genUuid();
  database.runSync(
    `INSERT INTO people (uuid, name, phone, email, identification, notes, isArchived, createdAt, updatedAt, syncState)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, 'pending')`,
    [uuid, input.name, input.phone ?? '', input.email ?? '', input.identification ?? '', input.notes ?? '', t, t],
  );
  const row = database.getFirstSync<Person>('SELECT * FROM people WHERE uuid = ?', [uuid]);
  return row!;
}

export function updatePerson(id: number, input: Partial<Person>): void {
  const database = getDb();
  const t = now();
  const sets: string[] = [];
  const values: SQLiteBindParams = [];
  const allowed = ['name', 'phone', 'email', 'identification', 'notes', 'isArchived'] as const;
  for (const k of allowed) {
    if (input[k] !== undefined) {
      sets.push(`${k} = ?`);
      values.push(input[k]);
    }
  }
  sets.push('updatedAt = ?', 'syncState = ?');
  values.push(t, 'pending', id);
  database.runSync(`UPDATE people SET ${sets.join(', ')} WHERE id = ?`, values);
}

export function deletePerson(id: number): void {
  const database = getDb();
  const t = now();
  database.runSync(
    `UPDATE people SET deletedAt = ?, updatedAt = ?, syncState = 'deleted' WHERE id = ?`,
    [t, t, id],
  );
}