import type { IncomingMessage, ServerResponse } from 'node:http';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv, type Plugin } from 'vite';

function localVercelApiPlugin(): Plugin {
  return {
    name: 'local-vercel-api-dev',
    configureServer(server) {
      server.middlewares.use('/api/chat', async (req: IncomingMessage, res: ServerResponse) => {
        const chunks: Buffer[] = [];
        req.on('data', (chunk: Buffer) => {
          chunks.push(chunk);
        });
        req.on('end', async () => {
          const rawBody = Buffer.concat(chunks).toString('utf8');
          let parsedBody: unknown = undefined;
          if (rawBody.length > 0) {
            try {
              parsedBody = JSON.parse(rawBody);
            } catch {
              parsedBody = rawBody;
            }
          }

          const vercelReq = Object.assign(req, {
            body: parsedBody,
            query: {},
            cookies: {},
          });

          const vercelRes = Object.assign(res, {
            status(code: number) {
              res.statusCode = code;
              return vercelRes;
            },
            json(payload: unknown) {
              if (!res.headersSent) {
                res.setHeader('Content-Type', 'application/json; charset=utf-8');
              }
              res.end(JSON.stringify(payload));
              return vercelRes;
            },
            send(payload: unknown) {
              if (typeof payload === 'string' || Buffer.isBuffer(payload)) {
                res.end(payload);
              } else {
                if (!res.headersSent) {
                  res.setHeader('Content-Type', 'application/json; charset=utf-8');
                }
                res.end(JSON.stringify(payload));
              }
              return vercelRes;
            },
            redirect(statusOrUrl: string | number, url?: string) {
              if (typeof statusOrUrl === 'number' && url) {
                res.statusCode = statusOrUrl;
                res.setHeader('Location', url);
              } else if (typeof statusOrUrl === 'string') {
                res.statusCode = 307;
                res.setHeader('Location', statusOrUrl);
              }
              res.end();
              return vercelRes;
            },
          });

          try {
            const mod = await server.ssrLoadModule('/api/chat.ts');
            await mod.default(vercelReq, vercelRes);
          } catch (err) {
            console.error('[local-vercel-api-dev] Error executing /api/chat:', err);
            if (!res.headersSent) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(
                JSON.stringify({
                  error: '로컬 API 서버 실행 중 오류가 발생했습니다.',
                  code: 'LOCAL_SERVER_ERROR',
                })
              );
            }
          }
        });
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Server-only env load so OPENAI_API_KEY in .env.local works during local `npm run dev`
  // without ever exposing it to the frontend bundle.
  const env = loadEnv(mode, process.cwd(), '');
  if (env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY) {
    process.env.OPENAI_API_KEY = env.OPENAI_API_KEY;
  }

  return {
    plugins: [react(), localVercelApiPlugin()],
  };
});
