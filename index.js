import Bottleneck from "bottleneck";
import express from "express";
import NodeCache from "node-cache";

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
      const url = new URL("https://geocode.maps.co/search");
      url.searchParams.append("q", q);

      const res = await fetch(url.toString());
      if (res.ok) {
        const json = await res.json();

        cache.set(q, json);

        res.status(200).json(json).end();
      }
    } catch (e) {
      res.status(500).end();
    }
  });
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
