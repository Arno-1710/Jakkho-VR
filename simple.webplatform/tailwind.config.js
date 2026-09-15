/** @type {import('tailwindcss').Config} */
export default {
	content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
	theme: {
		extend: {
			screens: {
				"md-lg": "920px", // breakpoint at (920px)
			},
			fontFamily: {
				sans: ["'Inter'", "system-ui", "-apple-system", "sans-serif"],
				inter: ["'Inter'", "sans-serif"],
				heading: ["'Space Grotesk'", "sans-serif"],
				display: ["'Space Grotesk'", "sans-serif"],
				space: ["'Space Grotesk'", "sans-serif"],
				mono: ["'Space Grotesk'", "ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "monospace"],
			},
		},
	},
	plugins: [],
};
