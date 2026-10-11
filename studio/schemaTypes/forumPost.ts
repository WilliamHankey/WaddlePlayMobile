import { defineField, defineType } from "sanity";
import { urlPreview } from "./urlPreview";

/** A discussion in the Forum tab. */
export const forumPost = defineType({
  name: "forumPost",
  title: "Forum post",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({ name: "body", title: "Body", type: "text", rows: 4, validation: rule => rule.required().min(10).max(5000) }),
    defineField({ name: "created_at", title: "Posted at", type: "datetime", readOnly: true }),
    defineField({ name: "topic", title: "Topic", type: "string", options: { list: ["Parenting", "Activities", "General", "Local"] } }),
    defineField({ name: "author_id", title: "Author family ID", type: "string" }),
    defineField({ name: "author_name", title: "Author name", type: "string" }),
    defineField({ name: "avatar_url", title: "Author avatar URL", type: "url" }),
    defineField({ name: "replies", title: "Reply count", type: "number" }),
    defineField({
      name: "hours_ago",
      title: "Hours ago",
      type: "number",
      description: "Relative age in hours; the Forum list is ordered by this field.",
    }),
  ],
  orderings: [
    { title: "Newest discussion first", name: "hoursAsc", by: [{ field: "hours_ago", direction: "asc" }] },
  ],
  preview: {
    select: { title: "title", topic: "topic", author: "author_name", media: "avatar_url" },
    prepare: ({ title, topic, author, media }) => ({
      title,
      subtitle: [topic, author].filter(Boolean).join(" - "),
      media: urlPreview(media),
    }),
  },
});
