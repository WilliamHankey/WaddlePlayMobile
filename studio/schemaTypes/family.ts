import { defineField, defineType } from "sanity";

/** A parent account's profile. One document per D1 user. */
export const family = defineType({
  name: "family",
  title: "Family",
  type: "document",
  fields: [
    defineField({
      name: "user_id",
      title: "User ID",
      type: "string",
      description:
        "Matches the `id` of the user row in Cloudflare D1. Written by the API on signup; changing it detaches the profile from its login.",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "parent_name",
      title: "Parent name",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({ name: "email", title: "Email", type: "string" }),
    defineField({ name: "location", title: "Location", type: "string" }),
    defineField({ name: "bio", title: "Bio", type: "text", rows: 3 }),
    defineField({
      name: "avatar_url",
      title: "Avatar URL",
      type: "url",
      description: "External image URL. Upload to Sanity and use the asset URL for hosted images.",
    }),
    defineField({
      name: "family_values",
      title: "Family values",
      type: "array",
      of: [{ type: "string" }],
      options: { layout: "tags" },
    }),
    defineField({
      name: "sensory_preferences",
      title: "Sensory preferences",
      type: "array",
      of: [{ type: "string" }],
      options: { layout: "tags" },
      description: "Used to score family-to-family and family-to-playdate matches.",
    }),
    defineField({
      name: "interests",
      title: "Interests",
      type: "array",
      of: [{ type: "string" }],
      options: { layout: "tags" },
    }),
    defineField({ name: "communication_style", title: "Communication style", type: "string" }),
    defineField({ name: "verified", title: "Verified", type: "boolean", initialValue: true }),
    defineField({
      name: "children",
      title: "Children",
      type: "array",
      of: [
        {
          type: "object",
          fields: [
            defineField({ name: "name", title: "Name", type: "string" }),
            defineField({ name: "age", title: "Age", type: "number" }),
            defineField({ name: "diagnosis", title: "Diagnosis", type: "string" }),
            defineField({
              name: "sensory_preferences",
              title: "Sensory preferences",
              type: "array",
              of: [{ type: "string" }],
              options: { layout: "tags" },
            }),
            defineField({
              name: "interests",
              title: "Interests",
              type: "array",
              of: [{ type: "string" }],
              options: { layout: "tags" },
            }),
            defineField({ name: "communication_style", title: "Communication style", type: "string" }),
          ],
          preview: {
            select: { title: "name", age: "age", diagnosis: "diagnosis" },
            prepare: ({ title, age, diagnosis }) => ({
              title: title ?? "Child",
              subtitle: [age != null ? `age ${age}` : null, diagnosis].filter(Boolean).join(", "),
            }),
          },
        },
      ],
    }),
  ],
  preview: {
    select: { title: "parent_name", subtitle: "location", media: "avatar_url" },
  },
});
