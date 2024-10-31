import type { D1Database } from "@cloudflare/workers-types";

export class DatabaseService {
	constructor(private db: D1Database) {}

	// Emoji関連
	async getEmoji(name: string) {
		return await this.db
			.prepare(
				"SELECT BIN_TO_UUID(id) as id, name, reaction_count, label FROM Emoji WHERE name = ?",
			)
			.bind(name)
			.first();
	}

	async upsertEmoji(name: string, label: string, creatorId: string) {
		const existingEmoji = await this.getEmoji(name);

		if (existingEmoji) {
			await this.db
				.prepare("UPDATE Emoji SET label = ? WHERE name = ?")
				.bind(label, name)
				.run();
			return existingEmoji.id;
		}

		const result = await this.db
			.prepare(
				"INSERT INTO Emoji (name, label, creator_id) VALUES (?, ?, UUID_TO_BIN(?))",
			)
			.bind(name, label, creatorId)
			.run();
		return result.meta.last_row_id;
	}

	async listEmojis(page = 1, pageSize = 10) {
		const offset = (page - 1) * pageSize;
		const emojis = await this.db
			.prepare(
				`SELECT BIN_TO_UUID(id) as id, name, label, reaction_count, 
      created_at, updated_at
      FROM Emoji
      ORDER BY reaction_count DESC
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

	// User関連
	async getOrCreateUser(slackUserId: string, name: string) {
		const user = await this.db
			.prepare(
				"SELECT BIN_TO_UUID(id) as id, name, total_point FROM User WHERE token = ?",
			)
			.bind(slackUserId)
			.first();

		if (user) return user;

		await this.db
			.prepare("INSERT INTO User (name, total_point, token) VALUES (?, 0, ?)")
			.bind(name, slackUserId)
			.run();

		return this.db
			.prepare(
				"SELECT BIN_TO_UUID(id) as id, name, total_point FROM User WHERE token = ?",
			)
			.bind(slackUserId)
			.first();
	}

	// Message関連
	async createMessage(text: string, userId: string, channelId: string) {
		return await this.db
			.prepare(
				"INSERT INTO Message (text, user_id, channel_id) VALUES (?, UUID_TO_BIN(?), ?)",
			)
			.bind(text, userId, channelId)
			.run();
	}

	// Reaction関連
	async createReaction(messageId: string, userId: string, emojiId: string) {
		return await this.db
			.prepare(
				`INSERT INTO Reaction (message_id, user_id, emoji_id) 
      VALUES (UUID_TO_BIN(?), UUID_TO_BIN(?), UUID_TO_BIN(?))`,
			)
			.bind(messageId, userId, emojiId)
			.run();
	}
}
