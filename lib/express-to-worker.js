import { Readable } from "node:stream";

export function expressToWorker(app) {
  return async (request, env, context) => {
    const url = new URL(request.url);

    const req = new Readable({ read() {} });
    req.url = url.pathname + url.search;
    req.method = request.method;
    req.headers = {};
    for (const [k, v] of request.headers) req.headers[k.toLowerCase()] = v;

    try {
      const buf = await request.arrayBuffer();
      if (buf && buf.byteLength) req.push(Buffer.from(buf));
    } catch (e) {
      // no body
    }
    req.push(null);

    let headers = {};
    let statusCode = 200;
    const chunks = [];
    let finishResolve;
    const finished = new Promise((resolve) => (finishResolve = resolve));

    const res = {
      setHeader(k, v) {
        headers[k.toLowerCase()] = v;
      },
      getHeader(k) {
        return headers[k.toLowerCase()];
      },
      removeHeader(k) {
        delete headers[k.toLowerCase()];
      },
      writeHead(code, head) {
        statusCode = code;
        if (head) Object.assign(headers, head);
      },
      write(chunk) {
        chunks.push(Buffer.from(chunk));
      },
      end(chunk) {
        if (chunk) chunks.push(Buffer.from(chunk));
        finishResolve();
      },
      on(event, cb) {
        if (event === "finish") finished.then(cb);
      },
      statusCode
    };

    try {
      // Invoke Express app
      app(req, res);
    } catch (err) {
      return new Response("Internal Server Error", { status: 500 });
    }

    await finished;

    const body = Buffer.concat(chunks);
    const respHeaders = new Headers();
    for (const [k, v] of Object.entries(headers)) respHeaders.set(k, String(v));

    return new Response(body, { status: res.statusCode || statusCode, headers: respHeaders });
  };
}
