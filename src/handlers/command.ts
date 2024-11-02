import type { DatabaseService } from "../services/d1";
import type { EmbeddingService } from "../services/embedding";

export class CommandHandler {
	constructor(
		private db: DatabaseService,
		private embeddingService: EmbeddingService,
		private env: Env,
	) {}

	async handle(text: string, userId: string, userName: string) {
		const [action, ...args] = text.trim().split(/\s+/);

		switch (action) {
			case "add":
				return await this.handleAdd(args, userId, userName);
			case "list":
				return await this.handleList(args);
			case "edit":
				return await this.handleEdit(args, userId);
			case "delete":
				return await this.handleDelete(args, userId);
			case "stats":
				return await this.handleStats(args);
			default:
				return this.handleHelp();
		}
	}

	private async handleAdd(args: string[], userId: string, userName: string) {
		if (args.length < 1) {
			return { text: "使用方法: `/emoji-label add :emoji: [ラベル]`" };
		}

		const [emojiName, ...labelParts] = args;
		const label = labelParts.join(" ");
		const cleanedEmojiName = emojiName.replace(/:/g, "");

		try {
			// ユーザーの作成/取得
			await this.db.getOrCreateUser(userId, userName);
			// 絵文字の登録/更新
			const emojiId = await this.db.upsertEmoji(
				cleanedEmojiName,
				label,
				userId,
			);

			const embedded = await this.embeddingService.getEmbedding(label);

			await this.env.VECTORIZE.insert([
				{
					id: emojiId,
					values: embedded,
					namespace: "emoji",
					metadata: { name: cleanedEmojiName },
				},
			]);

			return {
				text: `✅ 絵文字 ${emojiName} ${
					label ? `(ラベル: ${label})` : ""
				} を登録しました`,
			};
		} catch (error) {
			console.error("Add emoji error:", error);
			return {
				text: `❌ 登録に失敗しました, 少し時間を置いてから再度試してください \n\n \`/emoji-label add ${emojiName} ${label}\``,
			};
		}
	}

	private async handleList(args: string[]) {
		const page = Number.parseInt(args[0]) || 1;
		try {
			const { emojis, total } = await this.db.listEmojis(page);

			const blocks = [
				{
					type: "section",
					text: {
						type: "mrkdwn" as const,
						text: "*登録されている絵文字一覧:*",
					},
				},
				...emojis.map((emoji) => ({
					type: "section",
					text: {
						type: "mrkdwn" as const,
						text: `• :${emoji.name}: (ID: \`${emoji.id}\`)
               ${emoji.label ? `\nラベル: ${emoji.label}` : ""}
               \n作成者: ${emoji.creator_name} | リアクション数: ${
									emoji.reaction_count
								}`,
					},
				})),
				{
					type: "context",
					elements: [
						{
							type: "mrkdwn" as const,
							text: `ページ ${page}/${Math.ceil(total / 10)}`,
						},
					],
				},
			];

			return { blocks };
		} catch (error) {
			console.error("List emoji error:", error);
			return { text: "❌ リストの取得に失敗しました" };
		}
	}

	private async handleEdit(args: string[], userId: string) {
		if (args.length < 2) {
			return { text: "使用方法: `/emoji-label edit [:emoji:] 新しいラベル`" };
		}

		const [emojiName, ...labelParts] = args;
		const newLabel = labelParts.join(" ");
		const cleanedEmojiName = emojiName.replace(/:/g, "");

		try {
			const emoji = await this.db.getEmoji(cleanedEmojiName);
			if (!emoji) {
				return { text: "❌ 指定された絵文字が見つかりません" };
			}

			const result = await this.db.upsertEmoji(emoji.name, newLabel, userId);
			return { text: `✅ 絵文字 :${emoji.name}: のラベルを更新しました` };
		} catch (error) {
			console.error("Edit emoji error:", error);
			return { text: "❌ 更新に失敗しました" };
		}
	}

	private async handleDelete(args: string[], userId: string) {
		if (args.length < 1) {
			return { text: "使用方法: `/emoji-label delete :emoji:`" };
		}

		const emoji = args[0];

		try {
			const result = await this.db.deleteEmoji(emoji, userId);

			if (!result.success) {
				switch (result.error) {
					case "emoji_not_found":
						return { text: "❌ 指定された絵文字が見つかりません" };
					case "permission_denied":
						return { text: "❌ この絵文字を削除する権限がありません" };
					default:
						return { text: "❌ 削除処理中にエラーが発生しました" };
				}
			}

			return { text: `✅ ID: ${emoji} の絵文字を削除しました` };
		} catch (error) {
			console.error("Delete emoji error:", error);
			return { text: "❌ 削除処理中にエラーが発生しました" };
		}
	}

	private async handleStats(args: string[]) {
		const emojiName = args[0]?.replace(/:/g, "");

		try {
			const emoji = emojiName ? await this.db.getEmoji(emojiName) : null;
			if (emojiName && !emoji) {
				return { text: "❌ 指定された絵文字が見つかりません" };
			}

			const stats = await this.db.getEmojiStats(emoji?.id || "");
			if (!stats) {
				return { text: "❌ 統計情報が見つかりません" };
			}

			return {
				blocks: [
					{
						type: "section",
						text: {
							type: "mrkdwn" as const,
							text: "*絵文字使用統計:*",
						},
					},
					// ...stats.results.map(stat => ({
					//   type: "section",
					//   text: {
					//     type: "mrkdwn" as const,
					//     text: `:${stat.name}:
					//     \n• 合計リアクション数: ${stat.reaction_count}
					//     \n• ユニークユーザー数: ${stat.unique_users}
					//     \n• 使用メッセージ数: ${stat.unique_messages}`
					//   }
					// }))
				],
			};
		} catch (error) {
			console.error("Stats error:", error);
			return { text: "❌ 統計情報の取得に失敗しました" };
		}
	}

	private handleHelp() {
		return {
			blocks: [
				{
					type: "section",
					text: {
						type: "mrkdwn" as const,
						text: "*使用可能なコマンド:*",
					},
				},
				{
					type: "section",
					text: {
						type: "mrkdwn" as const,
						text: `• \`/emoji-label add :emoji: [ラベル]\` - 新しい絵文字とラベルを登録
- \`/emoji-label list [ページ番号]\` - 登録済みの絵文字を表示
- \`/emoji-label edit :emoji: 新しいラベル\` - ラベルを編集
- \`/emoji-label delete :emoji: \` - 絵文字を削除
- \`/emoji-label stats :emoji:\` - 使用統計を表示
- \`/emoji-label help\` - このヘルプを表示`,
					},
				},
			],
		};
	}
}
