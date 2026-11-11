import { signOut } from "../actions";

export async function GET() {
  "use server";
  return signOut();
}

export async function POST() {
  "use server";
  return signOut();
}