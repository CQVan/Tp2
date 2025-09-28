import { redirect } from "next/navigation";

export default function Match() {
  redirect("/matchmaking"); // Works only in server components
}
