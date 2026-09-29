import { defineField, defineType } from "sanity";

/** A bell notification. */
export const notification = defineType({
  name: "notification",
  title: "Notification",
  type: "document",
  fields: [
    defineField({ name: "title", title: "Title", type: "string", validation: (rule) => rule.required() }),
    defineField({ name: "body", title: "Body", type: "text", rows: 2 }),
    defineField({
      name: "kind",
      title: "Kind",
      type: "string",
      options: { list: ["playdate_join", "match", "forum", "safety", "resource"] },
    }),
    defineField({ name: "icon", title: "Icon", type: "string" }),
    defineField({ name: "at", title: "Time", type: "string", description: "Display string, e.g. `10 min ago`." }),
    defineField({ name: "unread", title: "Unread", type: "boolean", initialValue: false }),
  ],
  preview: {
    select: { title: "title", subtitle: "at", unread: "unread" },
    prepare: ({ title, subtitle, unread }) => ({ title: unread ? `• ${title}` : title, subtitle }),
  },
});
