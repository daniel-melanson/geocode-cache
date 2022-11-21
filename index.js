import Bottleneck from "bottleneck";
import { config } from "dotenv";
import express from "express";
import NodeCache from "node-cache";
config();

const app = express();
const port = process.env.PORT;

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const cache = new NodeCache({
  stdTTL: 2 * HOUR,
});

const limiter = new Bottleneck({
  minTime: 1 / 5,
});

app.get("/search", (req, res) => {
  const { q } = req.query;

  if (typeof q !== "string" || q.length < 4) return res.status(400).end();

  if (cache.has(q)) {
    return res.status(200).json(cache.get(q));
  }

  limiter.schedule(async () => {
    try {
      const url = new URL("https://api.geoapify.com/v1/geocode/search");

      url.searchParams.append("text", q);
      url.searchParams.append("apiKey", process.env["API_KEY"]);

      const response = await fetch(url.toString());
      if (response.ok) {
        const json = await response.json();

        const results = json.features.map(f => f.properties);

        cache.set(q, results);

        res.status(200).json(json).end();
      } else {
        res.status(response.status).end();
      }
    } catch (e) {
      res.status(500).end();
    }
  });
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
