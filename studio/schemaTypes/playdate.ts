import { defineField, defineType } from "sanity";

/** A playdate a family is hosting. */
export const playdate = defineType({
  name: "playdate",
  title: "Playdate",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "host_family_id",
      title: "Host family ID",
      type: "string",
      description: "`user_id` of the hosting family. The API lets this family approve or decline join requests.",
      validation: (rule) => rule.required(),
    }),
    defineField({ name: "host_name", title: "Host name", type: "string" }),
    defineField({ name: "category", title: "Category", type: "string" }),
    defineField({ name: "image_url", title: "Image URL", type: "url" }),
    defineField({ name: "location", title: "Location", type: "string" }),
    defineField({ name: "date", title: "Date", type: "date" }),
    defineField({ name: "start_time", title: "Start time", type: "string", description: "Display string, e.g. `10:00 AM`." }),
    defineField({ name: "end_time", title: "End time", type: "string", description: "Display string, e.g. `12:00 PM`." }),
    defineField({
      name: "age_range",
      title: "Age range",
      type: "string",
      description: "Display string, e.g. `4-6 years`. Derived from age_min/age_max when the API creates a playdate.",
    }),
    defineField({ name: "age_min", title: "Minimum age", type: "number" }),
    defineField({ name: "age_max", title: "Maximum age", type: "number" }),
    defineField({ name: "description", title: "Description", type: "text", rows: 4 }),
    defineField({
      name: "sensory_friendly_tags",
      title: "Sensory-friendly tags",
      type: "array",
      of: [{ type: "string" }],
      options: { layout: "tags" },
      description: "Compared with a family's sensory preferences to produce match reasons.",
    }),
    defineField({
      name: "interests",
      title: "Interests",
      type: "array",
      of: [{ type: "string" }],
      options: { layout: "tags" },
    }),
    defineField({
      name: "attendee_family_ids",
      title: "Attendee family IDs",
      type: "array",
      of: [{ type: "string" }],
      description: "Appended by the API when a join request is approved.",
    }),
    defineField({
      name: "attendees_avatars",
      title: "Attendee avatar URLs",
      type: "array",
      of: [{ type: "url" }],
    }),
    defineField({ name: "max_children", title: "Max children", type: "number" }),
    defineField({
      name: "private_note",
      title: "Private note",
      type: "text",
      rows: 2,
      description: "Only the host sees this in the app.",
    }),
    defineField({ name: "created_at", title: "Created at", type: "datetime" }),
  ],
  orderings: [
    {
      title: "Date, soonest first",
      name: "dateAsc",
      by: [{ field: "date", direction: "asc" }],
    },
  ],
  preview: {
    select: { title: "title", date: "date", location: "location", media: "image_url" },
    prepare: ({ title, date, location, media }) => ({
      title,
      subtitle: [date ? new Date(date).toDateString() : null, location].filter(Boolean).join(" - "),
      media,
    }),
  },
});
