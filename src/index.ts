import { SlackApp, type SlackEdgeAppEnv } from "slack-cloudflare-workers";

type Env = SlackEdgeAppEnv & {
	VECTORIZE: Vectorize;
	HF_API_TOKEN: string;
	CF_ACCOUNT_ID: string;
	CF_AI_GATEWAY_ID: string;
};

export default {
	async fetch(
		request: Request,
		env: Env,
		ctx: ExecutionContext
	): Promise<Response> {
		const app = new SlackApp({ env });

		// 絵文字レコメンド
		app.event("message", async ({ body, context }) => {
			const { event } = body;
			if (event.subtype === "bot_message") {
				return;
			}
			const { channel, ts, text } = event;

			if (channel && ts) {
				try {
					// URLを置換
					const replacedText = text.replace(
						/https?:\/\/[\w/:%#\$&\?\(\)~\.=\+\-]+/g,
						"<URL>"
					);
					const body = JSON.stringify({ input: replacedText });

					// Embedding
					const response = await fetch(
						`https://gateway.ai.cloudflare.com/v1/${env.CF_ACCOUNT_ID}/${env.CF_AI_GATEWAY_ID}/huggingface/intfloat/multilingual-e5-large`,
						{
							headers: {
								Authorization: `Bearer ${env.HF_API_TOKEN}`,
								ContentType: "application/json",
							},
							method: "POST",
							body: body,
						}
					);

					if (!response.ok) {
						throw new Error(
							`API error: ${response.status} ${response.statusText}`
						);
					}

					const embedded = await response.json<number[]>();
					const result = await env.VECTORIZE.query(embedded, {
						topK: 3,
						namespace: "emoji",
						returnMetadata: "all",
					});

					const recommendedReactions = result.matches.map((match) => ({
						id: match.id,
						emoji: match?.metadata?.emoji as string || "",
						score: match.score,
					}));

					// おすすめのリアクションを追加
					for (const reaction of recommendedReactions) {
						await context.client.reactions.add({
							channel: channel,
							name: reaction.emoji,
							timestamp: ts,
						});
						console.log(`Added reaction "${reaction}" to message ${ts}`);
					}
				} catch (error) {
					console.error("Failed to add reaction:", error);
				}
			}
		});

		// 絵文字追加処理
		app.command(
			"/emoji-label",
			async (_req) => {
				return "Loading...";
			},
			async (req) => {
				await req.context.respond({
					text: "Hey! This is an async response!",
				});
			}
		);

		// メンションを受けた時
		// app.event("app_mention", async ({ body, context }) => {
		// 	console.log("Received app_mention event", body);
		// 	const { event } = body;
		// 	if (event.subtype === "bot_message") {
		// 		return;
		// 	}
		// 	const { channel } = event;

		// 	await context.client.chat.postMessage({
		// 		channel: channel,
		// 		text: "JUST DO IT!!!!!!!!!!!!!!!",
		// 	});
		// });

		return await app.run(request, ctx);
	},
};
