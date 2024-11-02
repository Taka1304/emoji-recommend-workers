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
