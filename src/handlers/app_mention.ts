import type { SlackAppContext } from "slack-cloudflare-workers";
import { randomWord, summonOjisan } from "../utils/justDoIt";

export class AppMentionHandler {
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	async handle(event: any, context: SlackAppContext) {
		if (event.subtype === "bot_message") {
			return;
		}

		let word = "*Just Do It!*";
		// 2割の確率で違う語録を返す
		if (Math.random() < 0.2) {
			word = randomWord();
		}

		await context.client.chat.postMessage({
			channel: event.channel,
			text: summonOjisan,
		});

		await context.client.chat.postMessage({
			channel: event.channel,
			text: word,
		});
	}
}
