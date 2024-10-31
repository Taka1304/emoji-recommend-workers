export type CommandArgs = {
	add: { emoji: string; text: string };
	list: { page?: number };
	edit: { id: string; emoji?: string; text?: string };
	help: Record<string, never>;
};
