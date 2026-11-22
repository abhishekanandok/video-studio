import { redirect } from "next/navigation";

/** the old new-film screen is retired: starting a video now happens on the app's home (/app) */
export default function NewFilm() {
  redirect("/app");
}
