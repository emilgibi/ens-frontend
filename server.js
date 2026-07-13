const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || 'localhost';
const port = process.env.PORT || 5173;
const basePath = '/ens/frontend/v1';

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
    createServer((req, res) => {
        const parsedUrl = parse(req.url, true);
        const { pathname } = parsedUrl;

        if (pathname === '/') {
            res.writeHead(302, { Location: basePath + '/' });
            res.end();
            return;
        }

        handle(req, res, parsedUrl).catch((err) => {
            console.error('Error occurred handling', req.url, err);
            if (!res.headersSent) {
                res.statusCode = 500;
                res.end('internal server error');
            }
        });
    })
        .once('error', (err) => {
            console.error(err);
            process.exit(1);
        })
        .listen(port, () => {
            console.log(`> Ready on http://${hostname}:${port}${basePath}`);
        });
});