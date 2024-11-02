export type EmojiCommand = {
	add: { name: string; label?: string };
	list: { page?: number };
	edit: { id: string; label: string };
	delete: { id: string };
	help: Record<string, never>;
	stats: { emoji?: string };
};
