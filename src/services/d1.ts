import type { D1Database } from "@cloudflare/workers-types";
import type { Emoji } from "../types/d1";

export class DatabaseService {
	constructor(private db: D1Database) {}

	async getEmoji(name: string) {
		const stmt = this.db.prepare(
			"SELECT id, name, reaction_count, label FROM Emoji WHERE name = ?",
		);
		return await stmt.bind(name).first<Emoji>();
	}

	async upsertEmoji(name: string, label: string, creatorId: string) {
		const existingEmoji = await this.getEmoji(name);

		if (existingEmoji) {
			await this.db
				.prepare("UPDATE Emoji SET label = ?, creator_id = ? WHERE name = ?")
				.bind(label, creatorId, name)
				.run();
			return existingEmoji.id as string;
		}
		const id = crypto.randomUUID();
		console.log(id, name, label, creatorId);
		await this.db
			.prepare(
				"INSERT INTO Emoji (id, name, label, creator_id) VALUES (?, ?, ?, ?)",
			)
			.bind(id, name, label, creatorId)
			.run();
		return id;
	}

	async listEmojis(page = 1, pageSize = 10) {
		const offset = (page - 1) * pageSize;
		const emojis = await this.db
			.prepare(
				`SELECT e.id, e.name, e.label, e.reaction_count, 
      e.created_at, e.updated_at, u.name as creator_name
      FROM Emoji e
      LEFT JOIN User u ON e.creator_id = u.id
      ORDER BY e.reaction_count DESC, e.created_at DESC
      LIMIT ? OFFSET ?`,
			)
			.bind(pageSize, offset)
			.all();

		const total = await this.db
			.prepare("SELECT COUNT(*) as count FROM Emoji")
			.first<{ count: number }>();

		return {
			emojis: emojis.results,
			total: total?.count || 0,
			hasMore: offset + pageSize < (total?.count || 0),
		};
	}

	async deleteEmoji(emojiName: string, userId: string) {
		try {
			// トランザクション開始
			await this.db.prepare("BEGIN TRANSACTION").run();

			// 絵文字の存在と権限チェック
			const emoji = await this.db
				.prepare("SELECT creator_id FROM Emoji WHERE id = ?")
				.bind(emojiName)
				.first<{ creator_id: string }>();

			if (!emoji) {
				await this.db.prepare("ROLLBACK").run();
				return { success: false, error: "emoji_not_found" };
			}

			if (emoji.creator_id !== userId) {
				await this.db.prepare("ROLLBACK").run();
				return { success: false, error: "permission_denied" };
			}

			// 関連するリアクションを削除
			await this.db
				.prepare("DELETE FROM Reaction WHERE emoji_id = ?")
				.bind(emojiName)
				.run();

			// 絵文字を削除
			const result = await this.db
				.prepare("DELETE FROM Emoji WHERE id = ?")
				.bind(emojiName)
				.run();

			await this.db.prepare("COMMIT").run();

			return {
				success: true,
				changes: result.meta.changes,
			};
		} catch (error) {
			await this.db.prepare("ROLLBACK").run();
			throw error;
		}
	}

	// User関連
	async createUser(id: string, name: string) {
		return await this.db
			.prepare("INSERT INTO User (id, name, total_point) VALUES (?, ?, 0)")
			.bind(id, name)
			.run();
	}

	async getUser(id: string) {
		return await this.db
			.prepare("SELECT id, name, total_point FROM User WHERE id = ?")
			.bind(id)
			.first();
	}

	async getOrCreateUser(id: string, name: string) {
		const user = await this.db
			.prepare("SELECT id, name, total_point FROM User WHERE id = ?")
			.bind(id)
			.first();

		if (user) return user;

		await this.db
			.prepare("INSERT INTO User (id, name, total_point) VALUES (?, ?, 0)")
			.bind(id, name)
			.run();

		return await this.db
			.prepare("SELECT id, name, total_point FROM User WHERE id = ?")
			.bind(id)
			.first();
	}

	// Message関連
	async createMessage(
		id: string,
		text: string,
		userId: string,
		channelId: string,
	) {
		return await this.db
			.prepare(
				"INSERT INTO Message (id, text, user_id, channel_id) VALUES (?, ?, ?, ?)",
			)
			.bind(id, text, userId, channelId)
			.run();
	}

	// Reaction関連
	async createReaction(messageId: string, userId: string, emojiId: string) {
		const id = crypto.randomUUID();

		// D1のbatchメソッドを使用して、複数のクエリを一括で実行
		return await this.db
			.prepare("SELECT 1")
			.run()
			.then(async () => {
				return await this.db.batch([
					// リアクションの挿入
					this.db
						.prepare(
							"INSERT INTO Reaction (id, message_id, user_id, emoji_id) VALUES (?, ?, ?, ?)",
						)
						.bind(id, messageId, userId, emojiId),
					// 絵文字のリアクション数の更新
					this.db
						.prepare(
							"UPDATE Emoji SET reaction_count = reaction_count + 1 WHERE id = ?",
						)
						.bind(emojiId),
				]);
			});
	}

	// 絵文字の使用統計を取得
	async getEmojiStats(emojiId: string) {
		return await this.db
			.prepare(
				`SELECT 
        e.name, 
        e.reaction_count,
        COUNT(DISTINCT r.user_id) as unique_users,
        COUNT(DISTINCT r.message_id) as unique_messages
      FROM Emoji e
      LEFT JOIN Reaction r ON e.id = r.emoji_id
      WHERE e.id = ?
      GROUP BY e.id`,
			)
			.bind(emojiId)
			.first();
	}

	// メッセージに付けられたリアクションを取得
	async getMessageReactions(messageId: string) {
		return await this.db
			.prepare(
				`SELECT 
        e.name as emoji_name,
        e.label,
        COUNT(*) as count,
        GROUP_CONCAT(u.name) as users
      FROM Reaction r
      JOIN Emoji e ON r.emoji_id = e.id
      JOIN User u ON r.user_id = u.id
      WHERE r.message_id = ?
      GROUP BY e.id`,
			)
			.bind(messageId)
			.all();
	}

	// ユーザーのリアクション履歴を取得
	async getUserReactionHistory(userId: string, limit = 10) {
		return await this.db
			.prepare(
				`SELECT 
        e.name as emoji_name,
        m.text as message_text,
        r.created_at
      FROM Reaction r
      JOIN Emoji e ON r.emoji_id = e.id
      JOIN Message m ON r.message_id = m.id
      WHERE r.user_id = ?
      ORDER BY r.created_at DESC
      LIMIT ?`,
			)
			.bind(userId, limit)
			.all();
	}
}
