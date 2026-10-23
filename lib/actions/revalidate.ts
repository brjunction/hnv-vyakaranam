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
  revalidatePath("/");
  revalidatePath("/chapters", "layout");
  revalidatePath("/brhat/chapters", "layout");
  revalidatePath("/laghu/chapters", "layout");
}

export function revalidateScriptures() {
  revalidateTag(tags.scrAll);
  revalidatePath("/scriptures", "layout");
}

export function revalidateEverything() {
  for (const t of [tags.hnvAll, tags.scrAll, tags.daily, tags.home, tags.practice, tags.posts, tags.more, tags.songs, tags.settings]) revalidateTag(t);
  revalidatePath("/", "layout");
}

export function revalidatePractice() {
  revalidateTag(tags.practice);
  revalidatePath("/practice");
}

export function revalidateMore() {
  revalidateTag(tags.more);
  revalidatePath("/more", "layout");
}

export function revalidateSongs() {
  revalidateTag(tags.songs);
  revalidatePath("/songs", "layout");
  revalidatePath("/");
}
