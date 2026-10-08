import http from "node:http";
import { server as wisp } from "@mercuryworkshop/wisp-js/server";

const allowedOrigins = new Set(
	(process.env.ALLOWED_ORIGINS ?? "")
		.split(",")
		.map((origin) => origin.trim())
		.filter(Boolean)
);

if (allowedOrigins.size === 0) {
	throw new Error("Set ALLOWED_ORIGINS to the exact HTTPS origin of the site.");
}

wisp.options.allow_private_ips = false;
wisp.options.allow_loopback_ips = false;
wisp.options.allow_direct_ip = false;
wisp.options.allow_udp_streams = false;
wisp.options.stream_limit_per_host = 24;
wisp.options.stream_limit_total = 256;

const server = http.createServer((request, response) => {
	const pathname = new URL(request.url ?? "/", "http://localhost").pathname;
	if (pathname === "/healthz") {
		response.writeHead(200, { "content-type": "text/plain" });
		response.end("ok");
		return;
	}

	response.writeHead(404, { "content-type": "text/plain" });
	response.end("not found");
});

server.on("upgrade", (request, socket, head) => {
	const pathname = new URL(request.url ?? "/", "http://localhost").pathname;
	if (
		pathname !== "/wisp/" ||
		!allowedOrigins.has(request.headers.origin ?? "")
	) {
		socket.destroy();
		return;
	}

	wisp.routeRequest(request, socket, head);
});

const port = Number(process.env.PORT ?? 10000);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
	throw new RangeError("PORT must be a valid TCP port.");
}

server.listen(port, "0.0.0.0", () => {
	console.log(`Wisp server listening on port ${port}`);
});
