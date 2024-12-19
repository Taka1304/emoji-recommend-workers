import type { SlackAppContext } from "slack-cloudflare-workers";
import type { DatabaseService } from "../services/d1";

export class ReactionAddedHandler {
	constructor(
		private db: DatabaseService,
		private env: Env,
	) {}
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	async handle(event: any, context: SlackAppContext) {
		const { reaction, item, user, item_user } = event;
		await this.db.getOrCreateUser(user, "?");
		const emojiId = await this.db.upsertEmoji(reaction, "", user);
		try {
			await this.db.createReaction(`${item.channel}-${item.ts}`, user, emojiId);
		} catch (error) {
			console.log(
				"重複したリアクションなので、DBへの挿入でエラーを発生させました",
			);
		}
	}
}
