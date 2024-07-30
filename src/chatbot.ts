import "./utils/env";
import OpenAI from "openai";

export const chatbotUserID = "U07ENTS5E5R";
const aiModel = "gpt-4o-mini";

export class Chatbot {
  private readonly client: OpenAI;

  constructor() {
    this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  greet(): string {
    return "hello from open AI";
  }

  async respond(
    history: Array<OpenAI.ChatCompletionMessageParam>
  ): Promise<string> {
    return (
      (
        await this.client.chat.completions.create({
          messages: history,
          model: aiModel,
        })
      ).choices[0]?.message?.content || "AI didn't respond"
    );
  }
}
