import type { Env } from "../types/env";

export class EmbeddingService {
	constructor(private env: Env) {}

	async getEmbedding(text: string): Promise<number[]> {
		const replacedText = text.replace(
			/https?:\/\/[\w/:%#\$&\?\(\)~\.=\+\-]+/g,
			"<URL>",
		);
		const response = await fetch(
			`https://gateway.ai.cloudflare.com/v1/${this.env.CF_ACCOUNT_ID}/${this.env.CF_AI_GATEWAY_ID}/huggingface/intfloat/multilingual-e5-large`,
			{
				headers: {
					Authorization: `Bearer ${this.env.HF_API_TOKEN}`,
					"Content-Type": "application/json",
				},
				method: "POST",
				body: JSON.stringify({ inputs: replacedText }),
			},
		);
		const embedded = await response.json<number[]>();
		return embedded;
	}
}
