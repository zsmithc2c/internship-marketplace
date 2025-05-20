/* eslint-disable @typescript-eslint/no-explicit-any */
/*  We down-cast a couple of OpenAI chunk fields that are untyped in the SDK. */

import type { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";

/* ------------------------------------------------------------------ */
/*  Init OpenAI client                                                */
/* ------------------------------------------------------------------ */
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/* ------------------------------------------------------------------ */
/*  Message type                                                      */
/* ------------------------------------------------------------------ */
interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/* ------------------------------------------------------------------ */
/*  API Route                                                         */
/* ------------------------------------------------------------------ */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { messages } = req.body as { messages?: ChatMessage[] };

  if (!messages || !Array.isArray(messages)) {
    return res
      .status(400)
      .json({ error: "`messages` must be an array of chat messages" });
  }

  /* ---------- prepend system prompt ---------- */
  const system: ChatMessage = {
    role: "system",
    content:
      "You are an AI assistant that helps employers on an internship marketplace. " +
      "Guide them through creating and editing their company profile, posting internship listings, " +
      "and understanding dashboard metrics.  Be concise, friendly, and action-oriented.",
  };

  const chat: ChatMessage[] = [system, ...messages];

  /* ---------- open a streaming completion ---------- */
  let stream: AsyncIterable<any>;

  try {
    stream = await openai.chat.completions.create(
      {
        model: "gpt-3.5-turbo",
        temperature: 0.7,
        messages: chat,
        stream: true,
      },
      { timeout: 300_000 } // 5 min – plenty of head-room
    );
  } catch (err: any) {
    console.error("OpenAI error while creating stream:", err);
    return res
      .status(err.status ?? 500)
      .json({ error: "Failed to start completion stream" });
  }

  /* ---------- set SSE headers ---------- */
  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    Connection: "keep-alive",
    "Cache-Control": "no-cache, no-transform",
  });

  /* ---------- stream chunks to the client ---------- */
  try {
    for await (const chunk of stream) {
      /*  openai@4 returns a ChatCompletionChunk – we drill down               */
      /*  Choices[0].delta?.content is the token diff we want to forward.      */
      const delta = (chunk as any).choices?.[0]?.delta?.content as
        | string
        | undefined;
      if (delta) res.write(delta);
    }
  } catch (err) {
    console.error("Streaming loop error:", err);
  } finally {
    /* always end the response so the client closes cleanly */
    res.end();
  }
}
