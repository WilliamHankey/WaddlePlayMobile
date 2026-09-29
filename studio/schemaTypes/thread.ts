import { defineField, defineType } from "sanity";
import { urlPreview } from "./urlPreview";

/** A conversation between two families, including the pre-acceptance opener. */
export const thread = defineType({
  name: "thread",
  title: "Message thread",
  type: "document",
  fields: [
    defineField({
      name: "family_id",
      title: "Recipient family ID",
      type: "string",
      description: "`user_id` of the family being messaged. The initiator is in initiator_id.",
      validation: (rule) => rule.required(),
    }),
    defineField({ name: "initiator_id", title: "Initiator user ID", type: "string" }),
    defineField({
      name: "status",
      title: "Status",
      type: "string",
      description: "`requested` until the recipient accepts; the API blocks further messages before that.",
      options: { list: ["requested", "active", "declined"], layout: "radio" },
      initialValue: "requested",
    }),
    defineField({ name: "name", title: "Display name", type: "string" }),
    defineField({ name: "avatar_url", title: "Avatar URL", type: "url" }),
    defineField({ name: "last", title: "Last message preview", type: "string" }),
    defineField({ name: "at", title: "Last message time", type: "string", description: "Display string, e.g. `10:24`." }),
    defineField({ name: "unread", title: "Unread count", type: "number", initialValue: 0 }),
    defineField({
      name: "messages",
      title: "Messages",
      type: "array",
      of: [
        {
          type: "object",
          fields: [
            defineField({
              name: "from",
              title: "From",
              type: "string",
              options: { list: ["me", "them"], layout: "radio" },
            }),
            defineField({ name: "text", title: "Text", type: "text", rows: 2 }),
            defineField({ name: "at", title: "At", type: "string" }),
          ],
          preview: {
            select: { from: "from", text: "text" },
            prepare: ({ from, text }) => ({ title: from === "me" ? "You" : "Them", subtitle: text }),
          },
        },
      ],
    }),
  ],
  preview: {
    select: { title: "name", subtitle: "last", media: "avatar_url" },
    prepare: ({ title, subtitle, media }) => ({
      title,
      subtitle,
      media: urlPreview(media),
    }),
  },
});
