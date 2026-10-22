import "server-only";
import { revalidatePath, revalidateTag } from "next/cache";
import { tags } from "@/lib/data/tags";

// Every admin write revalidates through these helpers — never with
// hand-typed tag strings (docs/01-architecture.md §3.3).

export function revalidateDaily() {
  revalidateTag(tags.daily);
  revalidatePath("/");
}

export function revalidateHnv() {
  revalidateTag(tags.hnvAll);
  revalidateTag(tags.daily);
  revalidatePath("/chapters", "layout");
}

export function revalidateEverything() {
  for (const t of [tags.hnvAll, tags.daily, tags.home, tags.practice, tags.posts, tags.settings]) revalidateTag(t);
  revalidatePath("/", "layout");
}
