import { createSlackApp } from "./app";

export default {
	async fetch(
		request: Request,
		env: Env,
		ctx: ExecutionContext,
	): Promise<Response> {
		const app = createSlackApp(env);
		return await app.run(request, ctx);
	},
};

// 		// メンションを受けた時
// 		app.event("app_mention", async ({ body, context }) => {
// 			console.log("Received app_mention event", body);
// 			const { event } = body;
// 			if (event.subtype === "bot_message") {
// 				return;
// 			}
// 			const { channel } = event;

// 			await context.client.chat.postMessage({
// 				channel: channel,
// 				text: "JUST DO IT!",
// 			});
// 		});

// 		return await app.run(request, ctx);
// 	},
// };
