/** An interaction surface describes context, never identity or authorization. */
export type InteractionSurface =
  "web" | "iphone" | "telegram" | "instagram" | "whatsapp";
export const surfaceGuidance = (surface: InteractionSurface): string => {
  switch (surface) {
    case "instagram":
      return "The hero is using an Instagram surface. When relevant, invite them to mute or unfollow one distracting account. Do not claim access to their feed or subscriptions. Help them leave with one useful action.";
    case "telegram":
      return "The hero is using a Telegram surface. Keep replies short. When relevant, suggest muting a distracting channel or group. Never claim to read their chats or memberships.";
    case "whatsapp":
      return "The hero is using a WhatsApp surface. Respect relationships and attention. When relevant, suggest muting unnecessary notifications. Never claim access to their contacts or messages.";
    case "iphone":
      return "The hero is using the iPhone app. Help them choose one useful real-world action and put the phone away.";
    case "web":
      return "The hero is using the web game. Help them choose one useful real-world action and leave the screen when ready.";
  }
};
