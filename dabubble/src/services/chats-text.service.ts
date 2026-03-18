import { inject, Injectable } from "@angular/core";
import { DomSanitizer, SafeHtml } from "@angular/platform-browser";
import { reactionIcons } from '../app/reaction-icons';
import { User } from "../models/user.class";

@Injectable({ providedIn: 'root' })
export class ChatsTextService {
  private sanitizer = inject(DomSanitizer);
  private emojiCache = new Map<string, string>();
  private messageCache = new Map<string, string>();

  constructor() {
    /** Initializes the service and preloads emoji assets. */
    this.preCacheEmojis();
  }

  /** Preloads all reaction emoji images to warm up the browser cache. */
  private preCacheEmojis() {
    reactionIcons.forEach(iconName => {
      const img = new Image();
      img.src = `assets/reaction-icons/${iconName}.svg`;
    });
  }

  /** Inserts text at the current cursor position and restores the caret. */
  insertTextAtCursor(text: string, textarea: HTMLTextAreaElement, updateMessage: (newText: string) => void, setCaretCallback?: (pos: number) => void): number {
    const start = textarea.selectionStart ?? 0;
    const end = textarea.selectionEnd ?? 0;
    const currentText = textarea.value;
    const before = currentText.slice(0, start);
    const after = currentText.slice(end);
    const newText = before + text + after;
    updateMessage(newText);
    const caretPos = start + text.length;
    setTimeout(() => {
      textarea.selectionStart = textarea.selectionEnd = caretPos;
      textarea.focus();
      setCaretCallback?.(caretPos);
    });
    return caretPos;
  }

  /** Renders message text by replacing smileys, mentions, and channel references with HTML. */
  renderMessage(text: string, users: Record<string, User>, channels: any[] = []): SafeHtml {
    if (!text) return this.sanitizer.bypassSecurityTrustHtml('');
    const cacheKey = `${text}_${Object.keys(users).length}_${channels.length}`;
    if (this.messageCache.has(cacheKey)) {
      return this.sanitizer.bypassSecurityTrustHtml(this.messageCache.get(cacheKey)!);
    }
    let replaced = text;
    replaced = this.replaceSmileys(replaced);
    replaced = this.replaceSpecialMention(replaced, users);
    replaced = this.replaceGeneralMentions(replaced, users);
    replaced = this.replaceChannelMentions(replaced, channels);
    this.messageCache.set(cacheKey, replaced);
    return this.sanitizer.bypassSecurityTrustHtml(replaced);
  }

  /** Returns the HTML for a given emoji name, caching it for performance. */
  private getEmojiHtml(name: string): string {
    if (!this.emojiCache.has(name)) {
      this.emojiCache.set(name, `<img src="assets/reaction-icons/${name}.svg" alt="${name}" class="inline-smiley">`);
    }
    return this.emojiCache.get(name)!;
  }

  /** Replaces smiley codes with their corresponding HTML images. */
  private replaceSmileys(text: string): string {
    return text.replace(/:([a-zA-Z0-9_+-]+):/g, (match, name) =>
      this.getEmojiHtml(name)
    );
  }

  /** Replaces @Gastnutzer mentions with a special mention tag if the user exists. */
  private replaceSpecialMention(text: string, users: Record<string, User>): string {
    return text.replace(/@Gastnutzer(?=\s|$|[^\w\s])/g, (match) => {
      const user = this.findUserByNormalizedName(users, 'gastnutzer');
      return user ? this.createMentionTag(match, user) : match;
    });
  }

  /** Replaces @username mentions with mention tags if the user exists, ignoring "Gastnutzer". */
  private replaceGeneralMentions(text: string, users: Record<string, User>): string {
    return text.replace(/@([A-Za-zÄÖÜäöüß]+(?:\s+[A-Za-zÄÖÜäöüß]+)?)(?=\s|$|[^\w\s])/g, (match, capturedName) => {
      if (capturedName.toLowerCase() === 'gastnutzer') return match;
      const user = this.findUserByNormalizedName(users, capturedName.trim().toLowerCase());
      return user ? this.createMentionTag(`@${capturedName}`, user) : match;
    });
  }

  /** Replaces #channel mentions with channel mention tags if the channel exists. */
  private replaceChannelMentions(text: string, channels: any[]): string {
    return text.replace(/#([A-Za-zÄÖÜäöüß0-9_-]+)(?=\s|$|[^\w\s])/g, (match, capturedName) => {
      const channel = channels.find(c => c.name?.trim().toLowerCase() === capturedName.toLowerCase());
      return channel ? this.createChannelMentionTag(`#${capturedName}`, channel.id) : match;
    });
  }

  /** Finds a user by their normalized (trimmed, lowercase) name. */
  private findUserByNormalizedName(users: Record<string, User>, normalizedName: string): User | undefined {
    return Object.values(users).find(u => u.name.trim().toLowerCase() === normalizedName);
  }

  /** Creates an HTML span element for a user mention with embedded user data. */
  private createMentionTag(displayText: string, user: User): string {
    const userData = JSON.stringify({
      id: user.uid,
      name: user.name,
      img: user.img || 'default-user'
    });
    return `<span class="mention-tag" data-user='${userData}' data-action="openUserChat" title="Doppelklick zum Öffnen des Benutzerchats">${displayText}</span>`;
  }

  /** Creates an HTML span element for a channel mention with embedded channel ID. */
  private createChannelMentionTag(displayText: string, channelId: string): string {
    return `<span class="mention-tag channel-mention" data-channel-id="${channelId}" data-action="openChannel" title="Doppelklick zum Öffnen des Kanalchats">${displayText}</span>`;
  }

  /** Handles clicks on mention tags to trigger the appropriate action (open user chat or channel). */
  handleMentionClick(target: HTMLElement, openUserChat: (user: User) => void, openChannel: (channelId: string) => void): void {
    if (!target.classList.contains('mention-tag') || !target.dataset['action']) return;
    const action = target.dataset['action']!;
    switch (action) {
      case 'openChannel':
        const channelId = target.dataset['channelId'];
        if (channelId) openChannel(channelId);
        break;
      case 'openUserChat':
        const userJson = target.dataset['user'];
        if (userJson) {
          try {
            const userData = JSON.parse(userJson) as { id: string, name: string, img: string };
            const user: Partial<User> = { uid: userData.id, name: userData.name, img: userData.img };
            openUserChat(user as User);
          } catch (e) {
            console.error('Invalid user data in mention');
          }
        }
        break;
    }
  }

  /** Automatically adjusts textarea height to fit its content. */
  autoGrow(textarea: HTMLTextAreaElement): void {
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }

  /** Clears all internal emoji and message caches. */
  clearCache() {
    this.emojiCache.clear();
    this.messageCache.clear();
  }
}