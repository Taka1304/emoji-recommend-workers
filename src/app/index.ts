import { SlackApp } from "slack-cloudflare-workers";
import { MessageHandler } from "../handlers/message";
import { ShortcutHandler } from "../handlers/shortcut";
import { DatabaseService } from "../services/d1";
import { EmbeddingService } from "../services/embedding";
import type { Env } from "../types/env";

export function createSlackApp(env: Env) {
	const app = new SlackApp({ env });
	const embeddingService = new EmbeddingService(env);
	const db = new DatabaseService(env.D1);
	const messageHandler = new MessageHandler(env, embeddingService);
	const shortcutHandler = new ShortcutHandler(env, db);

	app.event("message", async ({ body, context }) => {
		await messageHandler.handleMessage(body.event, context);
	});

	app.event("app_mention", async ({ body, context }) => {
		const { event } = body;
		if (event.subtype === "bot_message") {
			return;
		}

		await context.client.chat.postMessage({
			channel: event.channel,
			text: "JUST DO IT!",
		});
	});

	return app;
}
