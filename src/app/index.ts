import { SlackApp, type WebhookParams } from "slack-cloudflare-workers";
import { AppMentionHandler } from "../handlers/app_mention";
import { CommandHandler } from "../handlers/command";
import { MessageHandler } from "../handlers/message";
import { ReactionAddedHandler } from "../handlers/reaction_added";
import { ShortcutHandler } from "../handlers/shortcut";
import { DatabaseService } from "../services/d1";
import { EmbeddingService } from "../services/embedding";

export function createSlackApp(env: Env) {
	const app = new SlackApp({ env });
	const embeddingService = new EmbeddingService(env);
	const db = new DatabaseService(env.DB);
	const messageHandler = new MessageHandler(env, db, embeddingService);
	const shortcutHandler = new ShortcutHandler(db);
	const commandHandler = new CommandHandler(db, embeddingService, env);
	const appMentionHandler = new AppMentionHandler();
	const reactionAddedHandler = new ReactionAddedHandler(db, env);

	app.command(
		"/emoji-label",
		async (_req) => {
			return;
		},
		async ({ body, context }) => {
			const response = await commandHandler.handle(
				body.text,
				body.user_id,
				body.user_name,
			);
			await context.respond({
				replace_original: false,
				thread_ts: body.ts,
				...response,
			} as WebhookParams);
		},
	);

	// 絵文字追加用
	app.shortcut("add_emoji_label", async ({ payload, context }) => {
		await shortcutHandler.handle(payload, context);
	});

	// 絵文字一覧表示用
	app.shortcut("list_emoji_labels", async ({ payload, context }) => {
		await shortcutHandler.handle(payload, context);
	});

	app.event("message", async ({ body, context }) => {
		await messageHandler.handleMessage(body.event, context);
	});

	app.event("app_mention", async ({ body, context }) => {
		const { event } = body;
		if (event.subtype === "bot_message") return;
		await appMentionHandler.handle(event, context);
	});

	app.event("reaction_added", async ({ body, context }) => {
		const { event } = body;
		await reactionAddedHandler.handle(event, context);
	});

	app.view("emoji_label_submission", async ({ payload, context, body }) => {
		const { view } = payload;
		const values = view.state.values;
		const emoji = values.emoji_block.emoji_select.selected_option?.value || "";
		const label = values.text_block.text_input.value || "";

		console.log(body);

		try {
			await db.getOrCreateUser(body.user.id, body.user.name);

			const id: string = body.user.id || "";

			const emojiId = await db.upsertEmoji(emoji, label, id);

			const embedded = await embeddingService.getEmbedding(label);

			await env.VECTORIZE.insert([
				{
					id: emojiId,
					values: embedded,
					namespace: "emoji",
					metadata: { name: emoji },
				},
			]);

			return {
				response_action: "clear",
			};
		} catch (error) {
			console.error("Error saving emoji label:", error);
			return {
				response_action: "errors",
				errors: {
					text_block: "保存中にエラーが発生しました",
				},
			};
		}
	});

	return app;
}
