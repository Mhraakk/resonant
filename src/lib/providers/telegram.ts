/**
 * Optional Telegram catalog adapter.
 * Requires TELEGRAM_BOT_TOKEN + authorized channel access.
 * Does NOT scrape private content. Uses official Bot API only.
 * Not required for core RESONANT operation.
 */

import type { MusicProvider, ProviderSearchParams, ProviderSearchResult } from "./types";

const BOT = process.env.TELEGRAM_BOT_TOKEN;
const CHANNEL = process.env.TELEGRAM_CATALOG_CHANNEL;

export const telegramProvider: MusicProvider = {
  name: "internal",

  async isAvailable() {
    return Boolean(BOT && CHANNEL);
  },

  async search(params: ProviderSearchParams): Promise<ProviderSearchResult> {
    if (!BOT || !CHANNEL) {
      return { tracks: [], provider: "internal", rawCount: 0 };
    }
    console.info(
      "[telegram-provider] credentials present but channel message parsing is opt-in; returning empty until channel schema is configured"
    );
    return { tracks: [], provider: "internal", rawCount: 0 };
  },
};

export const TELEGRAM_ENV_HINT = {
  TELEGRAM_BOT_TOKEN: "BotFather token — never commit",
  TELEGRAM_CATALOG_CHANNEL: "Public channel username where bot is allowed to read",
};
