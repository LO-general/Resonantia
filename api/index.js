import app from './_server.mjs';

export default function handler(req, res) {
  return app(req, res);
}
