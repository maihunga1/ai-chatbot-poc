import { App, LogLevel, SayArguments } from "@slack/bolt";
import OpenAI from "openai";

import { Chatbot, chatbotUserID } from "./chatbot";
import "./utils/env";

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  appToken: process.env.SLACK_APP_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  logLevel: LogLevel.INFO,
});

const chatbot = new Chatbot();

(async () => {
  await app.start();
})();

app.event("app_mention", async ({ event, client, say, logger }) => {
  try {
    const {
      channel: channelID,
      thread_ts: threadID,
      user: userID,
      text: prompt,
    } = event;

    if (!threadID) {
      await say({
        text: "please only use me in a thread :thread:",
      });

      return;
    }

    if (!userID) {
      // this shouldn't happen, but the chat bot should say/log something here
      return;
    }

    const threadHistory = await getThreadHistory(
      channelID,
      threadID,
      userID,
      prompt
    );

    const responsePayload: SayArguments = {
      text: await chatbot.respond(threadHistory),
      thread_ts: threadID,
    };

    await say(responsePayload);
  } catch (error) {
    logger.error("failed to respond to mention", error);
  }
});

const getThreadHistory = async (
  channelID: string,
  threadID: string,
  userID: string,
  prompt: string
): Promise<OpenAI.Chat.Completions.ChatCompletionMessageParam[]> => {
  const replies = await app.client.conversations.replies({
    channel: channelID,
    ts: threadID,
  });

  const history: Array<OpenAI.ChatCompletionMessageParam> = [
    {
      role: "system",
      content: `
	  You are a helpful assistant, please reply to the thread. Conversation history (if any) is provided to you.
	  Context: this is Slack's message history, userIDs are prefixed with U (e.g. U07FBNZE0N4, U07ENS3R9MZ)

	  If you see <@U07FBNZE0N4> in message, then it means user U07FBNZE0N4 is being mentioned

	  Similarly, in your response, if you need to mention user U07FBNZE0N4, then say <@U07FBNZE0N4>

	  FYI, your userID is U07ENTS5E5R
		`,
    },
  ];

  if (replies.messages) {
    for (const reply of replies.messages) {
      const isAI = reply.user === chatbotUserID;
      let content: string = reply.text || "";

      if (!isAI) {
        content = `${reply.user} said: ` + content;
      }

      history.push({
        role: isAI ? "assistant" : "user",
        content: content,
      });
    }
  }

  history.push({
    role: "user",
    content: `${userID} said ${prompt}`,
  });

  return history;
};
