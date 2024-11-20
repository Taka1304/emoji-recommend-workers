const RANDOM_EMOJIS = [
	"+1",
	"smile",
	"tada",
	"sparkles",
	"heart_on_fire",
	"eyes",
	// Custom Emojis
	"yosasou",
	"eye_hakushin",
	"naruhodo",
	"explosion",
	"kaiten_notty",
	"wakaru",
	"meow_heart_bongo",
	"igyo",
];

export const pickEmojis = (n: number) => {
	const shuffledEmojis = RANDOM_EMOJIS.sort(() => 0.5 - Math.random());
	const emojis = shuffledEmojis.slice(0, n);
	return Array.from(emojis);
};
