export interface ChatMessageMenuState {
  messageId: string;
  right: number;
  top: number;
}

export const resolveCurrentMessage = <T extends {id: string}>(
  messages: readonly T[] | undefined,
  menuState: ChatMessageMenuState | null,
) => {
  if (!menuState) {
    return null;
  }

  return messages?.find(message => message.id === menuState.messageId) ?? null;
};
