import { defineField, defineType } from "sanity";

/**
 * A family another family has blocked. The API creates these with a compound
 * id (`<user_id>.<target_family_id>`) so blocking twice is a no-op.
 *
 * Named safetyBlock rather than block because `block` is reserved by Sanity for
 * its rich-text block type, and a schema using it fails to validate.
 */
export const safetyBlock = defineType({
  name: "safetyBlock",
  title: "Safety block",
  type: "document",
  fields: [
    defineField({ name: "user_id", title: "User ID", type: "string", validation: (rule) => rule.required() }),
    defineField({
      name: "target_family_id",
      title: "Blocked family ID",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({ name: "created_at", title: "Created at", type: "datetime" }),
  ],
  preview: {
    select: { user: "user_id", target: "target_family_id" },
    prepare: ({ user, target }) => ({ title: target, subtitle: `blocked by ${user}` }),
  },
});
