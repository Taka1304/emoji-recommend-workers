import type { SlackEdgeAppEnv } from "slack-cloudflare-workers";

export type Env = SlackEdgeAppEnv & {
	D1: D1Database;
	VECTORIZE: Vectorize;
	HF_API_TOKEN: string;
	CF_ACCOUNT_ID: string;
	CF_AI_GATEWAY_ID: string;
};
