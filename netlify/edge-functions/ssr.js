import server from "../../dist/server/index.js";

const STATIC_PATHS = new Set(["/favicon.ico", "/Logo.png"]);

export default async (request, context) => {
  const { pathname } = new URL(request.url);

  if (pathname.startsWith("/assets/") || STATIC_PATHS.has(pathname)) {
    return context.next();
  }

  return server.fetch(request, context);
};
