import { defineField, defineType } from "sanity";

/** A safety report a family filed about another family. */
export const report = defineType({
  name: "report",
  title: "Report",
  type: "document",
  fields: [
    defineField({ name: "user_id", title: "Reporting user ID", type: "string", validation: (rule) => rule.required() }),
    defineField({
      name: "target_family_id",
      title: "Reported family ID",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({ name: "reason", title: "Reason", type: "text", rows: 3 }),
    defineField({ name: "created_at", title: "Created at", type: "datetime" }),
  ],
  preview: {
    select: { target: "target_family_id", created: "created_at" },
    prepare: ({ target, created }) => ({ title: target, subtitle: created }),
  },
});
