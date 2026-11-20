import type { Metadata } from "next";
import { SectionPlaceholder } from "@/components/admin/section-placeholder";

export const metadata: Metadata = { title: "Posts" };

export default function PostsPage() {
  return (
    <SectionPlaceholder
      title="Posts"
      phase="Phase 4"
      role="editor"
      description="Blog posts with a Tiptap rich-text editor, scheduling, categories, tags and a per-post SEO box."
      bullets={[
    "Single post editor with autosave and last 10 revisions",
    "Scheduled publishing via a GitHub Action every 15 minutes",
    "SEO checklist score and SERP preview",
      ]}
    />
  );
}