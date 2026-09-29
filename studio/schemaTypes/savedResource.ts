import { defineField, defineType } from "sanity";

/**
 * A resource a family bookmarked. Written by the API with a compound id
 * (`<user_id>.<resource_id>`) so a save is idempotent; there is normally no
 * reason to create one by hand.
 */
export const savedResource = defineType({
  name: "savedResource",
  title: "Saved resource",
  type: "document",
  fields: [
    defineField({ name: "user_id", title: "User ID", type: "string", validation: (rule) => rule.required() }),
    defineField({
      name: "resource_id",
      title: "Resource ID",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({ name: "saved_at", title: "Saved at", type: "datetime" }),
  ],
  preview: {
    select: { user: "user_id", resource: "resource_id" },
    prepare: ({ user, resource }) => ({ title: resource, subtitle: `saved by ${user}` }),
  },
});
