import type { SlackAppContext } from "slack-cloudflare-workers";
import type { EmbeddingService } from "../services/embedding";
import type { Env } from "../types/env";

export class MessageHandler {
	constructor(
		private env: Env,
		private embeddingService: EmbeddingService,
	) {}

	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	async handleMessage(event: any, context: SlackAppContext) {
		if (event.subtype === "bot_message") return;

		console.log("handle Message", event.text);

		const { channel, ts, text } = event;
		if (!channel || !ts || !text) return;

		try {
			const embedding = await this.embeddingService.getEmbedding(text);
			const result = await this.env.VECTORIZE.query(embedding, {
				topK: 3,
				namespace: "emoji",
				returnMetadata: "all",
			});

			await this.addReactions(result, channel, ts, context);
		} catch (error) {
			const result: VectorizeMatches = {
				matches: [
					{
						id: "",
						metadata: {
							emoji: "warning",
						},
						score: 1,
					},
				],
				count: 1,
			};
			await this.addReactions(result, channel, ts, context);
			console.error("Message handling error:", error);
		}
	}

	private async addReactions(
		result: VectorizeMatches,
		channel: string,
		ts: string,
		context: SlackAppContext,
	) {
		const reactions = result.matches.map((match) => ({
			emoji: (match?.metadata?.emoji as string) || "",
		}));

		for (const { emoji } of reactions) {
			try {
				await context.client.reactions.add({
					channel,
					name: emoji,
					timestamp: ts,
				});
			} catch (error) {
				console.error(`Failed to add reaction ${emoji}:`, error);
			}
		}
	}
}
