// TODO: ORM無しで自動生成する方法ないの？(´・ω・`)

export type Timestamp = {
	created_at: string;
	updated_at: string;
};

export type User = {
	id: string;
	name: string;
	total_point: number;
} & Timestamp;

export type Emoji = {
	id: string;
	name: string;
	label: string | null;
	reaction_count: number | null;
	creator_id: string;
} & Timestamp;

export type Message = {
	id: string;
	text: string;
	user_id: string;
	channel_id: string;
	updated_at: string;
} & Timestamp;

export type Reaction = {
	id: string;
	message_id: string;
	user_id: string;
	emoji_id: string;
} & Timestamp;
