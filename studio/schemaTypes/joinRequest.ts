import { defineField, defineType } from "sanity";

/** A family's request to join a playdate. The host approves or declines it. */
export const joinRequest = defineType({
  name: "joinRequest",
  title: "Join request",
  type: "document",
  fields: [
    defineField({
      name: "playdate_id",
      title: "Playdate ID",
      type: "string",
      description: "API id of the playdate, i.e. the `playdate` document id without the `playdate.` prefix.",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "user_id",
      title: "Requesting user ID",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "status",
      title: "Status",
      type: "string",
      options: {
        list: ["pending", "approved", "declined"],
        layout: "radio",
      },
      initialValue: "pending",
      validation: (rule) => rule.required(),
    }),
    defineField({ name: "created_at", title: "Created at", type: "datetime" }),
    defineField({ name: "decided_at", title: "Decided at", type: "datetime" }),
  ],
  preview: {
    select: { title: "status", playdate: "playdate_id", user: "user_id" },
    prepare: ({ title, playdate, user }) => ({ title, subtitle: `${user} -> ${playdate}` }),
  },
});
