import type { Config } from "tailwindcss";
import forms from "@tailwindcss/forms";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#172033",
        canvas: "#f4f6f9",
        accent: "#2563eb",
      },
    },
  },
  plugins: [forms],
} satisfies Config;
