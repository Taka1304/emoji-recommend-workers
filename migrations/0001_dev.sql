-- Migration number: 0001 	 2024-10-31T10:53:02.829Z
CREATE TABLE "User" (
    "id" TEXT PRIMARY KEY NOT NULL,
    "name" TEXT NOT NULL,
    "total_point" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME DEFAULT (datetime('now')),
    "updated_at" DATETIME DEFAULT (datetime('now'))
);

CREATE TABLE "Emoji" (
    "id" TEXT PRIMARY KEY NOT NULL,
    "name" TEXT NOT NULL,
    "reaction_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME DEFAULT (datetime('now')),
    "updated_at" DATETIME DEFAULT (datetime('now')),
    "label" TEXT,
    "creator_id" TEXT,
    FOREIGN KEY ("creator_id") REFERENCES "User" ("id")
);

CREATE TABLE "Message" (
    "id" TEXT PRIMARY KEY NOT NULL,
    "created_at" DATETIME DEFAULT (datetime('now')),
    "text" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "channel_id" TEXT NOT NULL,
    "updated_at" DATETIME DEFAULT (datetime('now')),
    FOREIGN KEY ("user_id") REFERENCES "User" ("id")
);

CREATE TABLE "Reaction" (
    "id" TEXT PRIMARY KEY NOT NULL,
    "created_at" DATETIME DEFAULT (datetime('now')),
    "message_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "emoji_id" TEXT NOT NULL,
    FOREIGN KEY ("emoji_id") REFERENCES "Emoji" ("id"),
    FOREIGN KEY ("message_id") REFERENCES "Message" ("id"),
    FOREIGN KEY ("user_id") REFERENCES "User" ("id")
);

-- updated_atを自動更新するためのトリガー
CREATE TRIGGER update_user_timestamp 
    AFTER UPDATE ON "User"
BEGIN
    UPDATE "User" SET updated_at = datetime('now')
    WHERE id = NEW.id;
END;

CREATE TRIGGER update_emoji_timestamp
    AFTER UPDATE ON "Emoji"
BEGIN
    UPDATE "Emoji" SET updated_at = datetime('now')
    WHERE id = NEW.id;
END;

CREATE TRIGGER update_message_timestamp
    AFTER UPDATE ON "Message"
BEGIN
    UPDATE "Message" SET updated_at = datetime('now')
    WHERE id = NEW.id;
END;