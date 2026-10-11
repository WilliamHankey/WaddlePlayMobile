import { defineField, defineType } from "sanity";
import { urlPreview } from "./urlPreview";

/** An article, guide or video in the Resources tab. */
export const resource = defineType({
  name: "resource",
  title: "Resource",
  type: "document",
  fields: [
    defineField({ name: "title", title: "Title", type: "string", validation: (rule) => rule.required() }),
    defineField({ name: "summary", title: "Summary", type: "text", rows: 3 }),
    defineField({ name: "body", title: "Full content", type: "text", rows: 12 }),
    defineField({ name: "source_url", title: "Original resource URL", type: "url", validation: (rule) => rule.uri({ scheme: ["https"] }) }),
    defineField({
      name: "kind",
      title: "Kind",
      type: "string",
      options: { list: ["article", "guide", "video", "service"], layout: "radio" },
    }),
    defineField({ name: "image_url", title: "Image URL", type: "url" }),
    defineField({ name: "read_minutes", title: "Read minutes", type: "number" }),
    defineField({
      name: "featured",
      title: "Featured",
      type: "boolean",
      initialValue: false,
      description: "Featured resources appear in the carousel.",
    }),
  ],
  preview: {
    select: { title: "title", kind: "kind", media: "image_url" },
    prepare: ({ title, kind, media }) => ({ title, subtitle: kind, media: urlPreview(media) }),
  },
});
