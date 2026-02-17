import { defineAction } from "astro:actions";
import { z } from "astro:schema";

const contactInput = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters."),
  email: z.string().trim().email("Enter a valid email address."),
  message: z
    .string()
    .trim()
    .min(10, "Message must be at least 10 characters.")
    .max(1000, "Message must be 1000 characters or fewer."),
});

const ACTION_DELAY_MS = 800;

export const server = {
  contactServer: defineAction({
    accept: "form",
    input: contactInput,
    handler: async (input) => {
      await new Promise((resolve) => setTimeout(resolve, ACTION_DELAY_MS));

      return {
        message: `Thanks ${input.name}, your message has been received.`,
        submittedAt: new Date().toISOString(),
      };
    },
  }),

  contactClient: defineAction({
    accept: "form",
    input: contactInput,
    handler: async (input) => {
      await new Promise((resolve) => setTimeout(resolve, ACTION_DELAY_MS));

      return {
        message: `Submitted from client script for ${input.name}.`,
        submittedAt: new Date().toISOString(),
      };
    },
  }),
};
