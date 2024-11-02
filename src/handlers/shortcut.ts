import type {
	AnyModalBlock,
	GlobalShortcut,
	MessageShortcut,
	SlackAppContext,
} from "slack-cloudflare-workers";
import type { DatabaseService } from "../services/d1";

export class ShortcutHandler {
	constructor(private db: DatabaseService) {}

	async handle(
		payload: GlobalShortcut | MessageShortcut,
		context: SlackAppContext,
	) {
		const { callback_id, trigger_id } = payload;

		switch (callback_id) {
			case "add_emoji_label":
				return this.openEmojiLabelModal(trigger_id, context);
			case "list_emoji_labels":
				return this.openListModal(trigger_id, context);
		}
	}

	private async openEmojiLabelModal(
		trigger_id: string,
		context: SlackAppContext,
	) {
		const emojiList = await context.client.emoji.list();
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		const options = Object.keys(emojiList.emoji!)
			.slice(0, 99)
			.map((emoji) => ({
				text: {
					type: "plain_text" as const,
					text: `:${emoji}:`,
					emoji: true,
				},
				value: emoji,
			}));

		await context.client.views.open({
			trigger_id,
			view: {
				type: "modal",
				callback_id: "emoji_label_submission",
				title: {
					type: "plain_text",
					text: "絵文字ラベルを登録",
				},
				blocks: [
					{
						type: "input",
						block_id: "emoji_block",
						label: {
							type: "plain_text",
							text: "絵文字を選択",
						},
						element: {
							type: "static_select",
							placeholder: {
								type: "plain_text",
								text: "絵文字を選択してください",
							},
							options: options,
							action_id: "emoji_select",
						},
					},
					{
						type: "input",
						block_id: "text_block",
						label: {
							type: "plain_text",
							text: "ラベル",
						},
						element: {
							type: "plain_text_input",
							action_id: "text_input",
							multiline: true,
						},
					},
				],
				submit: {
					type: "plain_text",
					text: "登録",
				},
			},
		});
	}

	async openListModal(trigger_id: string, context: SlackAppContext, page = 1) {
		const { emojis, hasMore } = await this.db.listEmojis(page);

		const blocks: AnyModalBlock[] = [
			{
				type: "section",
				text: {
					type: "mrkdwn",
					text: "*登録済みの絵文字ラベル*",
				},
			},
			...emojis.map((emoji) => ({
				type: "section" as const,
				text: {
					type: "mrkdwn" as const,
					text: `:${emoji.name}: ${emoji.label}\n使用回数: ${emoji.reaction_count}回`,
				},
			})),
		];

		if (hasMore) {
			blocks.push({
				type: "actions",
				elements: [
					{
						type: "button",
						text: {
							type: "plain_text",
							text: "次のページ",
						},
						action_id: "next_page",
						value: String(page + 1),
					},
				],
			});
		}

		await context.client.views.open({
			trigger_id,
			view: {
				type: "modal",
				title: {
					type: "plain_text",
					text: "絵文字ラベル一覧",
				},
				blocks,
				callback_id: "list_emoji_labels_view",
			},
		});
	}
}
