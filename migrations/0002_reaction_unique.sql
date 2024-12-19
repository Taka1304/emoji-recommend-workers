
DROP TABLE Reaction;

CREATE TABLE Reaction (
    "id" TEXT PRIMARY KEY NOT NULL,
    "message_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "emoji_id" TEXT NOT NULL,
    "created_at" DATETIME DEFAULT (datetime('now')),
    UNIQUE("message_id", "user_id", "emoji_id"),
    FOREIGN KEY ("emoji_id") REFERENCES "Emoji" ("id"),
    FOREIGN KEY ("message_id") REFERENCES "Message" ("id"),
    FOREIGN KEY ("user_id") REFERENCES "User" ("id")
);

CREATE INDEX idx_reaction_message ON Reaction(message_id);
CREATE INDEX idx_reaction_user ON Reaction(user_id);
CREATE INDEX idx_reaction_emoji ON Reaction(emoji_id);