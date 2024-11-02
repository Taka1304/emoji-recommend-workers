export class EmbeddingService {
	constructor(private env: Env) {}

	// 503 Error の場合リトライする
	private async retryFetch(
		url: string,
		options: RequestInit,
		retries = 2,
		delay = 5000,
	): Promise<Response> {
		for (let i = 0; i < retries; i++) {
			const response = await fetch(url, options);
			if (response.status !== 503) {
				return response;
			}
			await new Promise((resolve) => setTimeout(resolve, delay));
		}
		throw new Error("Failed to fetch after multiple retries");
	}

	async getEmbedding(text: string): Promise<number[]> {
		const replacedText = text.replace(
			/https?:\/\/[\w/:%#\$&\?\(\)~\.=\+\-]+/g,
			"<URL>",
		);
		const response = await this.retryFetch(
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
