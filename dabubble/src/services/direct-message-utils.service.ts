import { Injectable, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { User } from '../models/user.class';
import { Channel } from '../models/channel.class';

/**
 * Utility service for Direct Message chat functionality.
 * Handles text manipulation, DOM helpers, date formatting, reactions, and rendering.
 * Extracted from DirectMessageChatsComponent to reduce LOC and improve testability.
 */
@Injectable({ providedIn: 'root' })
export class DirectMessageUtilsService {
    private sanitizer = inject(DomSanitizer);

    // === TEXT MANIPULATION ===
    /**
     * Inserts text at specific position in string (replaces selection range).
     * @param text Original text
     * @param insert Text to insert
     * @param start Start position
     * @param end End position (replacement range)
     * @returns Modified text with insertion
     */
    insertTextAt(text: string, insert: string, start: number, end: number): string {
        return text.slice(0, start) + insert + text.slice(end);
    }

    /**
     * Extracts current selection range from textarea.
     * @param textarea Target textarea element
     * @returns Object with start and end positions
     */
    getSelectionRange(textarea: HTMLTextAreaElement): { start: number; end: number } {
        return { start: textarea.selectionStart ?? 0, end: textarea.selectionEnd ?? 0 };
    }

    /**
     * Builds mention text by replacing trigger word (@/#) at end of before-text.
     * @param text Complete text
     * @param pos Caret position
     * @param trigger @ or #
     * @param name Mention name to insert
     * @returns Object with replaced before-text and remaining after-text
     */
    buildMentionText(text: string, pos: number, trigger: string, name: string): { replaced: string; after: string } {
        const before = text.slice(0, pos);
        const after = text.slice(pos);
        const replaced = before.replace(/([@#])([^\s]*)$/, `${trigger}${name}`);
        return { replaced, after };
    }

    // === DOM HELPERS ===
    /**
     * Sets cursor position in textarea with focus (async via setTimeout).
     * @param textarea Target textarea element
     * @param position Cursor position
     */
    setCursorPosition(textarea: HTMLTextAreaElement, position: number): void {
        setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = position;
            textarea.focus();
        });
    }

    /**
     * Sets cursor position in main textarea and focuses.
     * @param textarea Target textarea element
     * @param position New cursor position
     */
    focusTextareaAt(textarea: HTMLTextAreaElement, position: number): void {
        setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = position;
            textarea.focus();
        });
    }

    /**
     * Sets cursor position in message edit textarea.
     * @param messageId ID of the message being edited
     * @param position New cursor position
     */
    focusEditTextarea(messageId: string, position: number): void {
        setTimeout(() => {
            const textarea = document.getElementById(`edit-${messageId}`) as HTMLTextAreaElement;
            if (textarea) {
                textarea.selectionStart = textarea.selectionEnd = position;
                textarea.focus();
            }
        });
    }

    /**
     * Automatically adjusts textarea height to fit content.
     * @param el Textarea element to resize
     */
    autoGrow(el: HTMLTextAreaElement | null): void {
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = `${el.scrollHeight}px`;
    }

    /**
     * Scrolls chat container to bottom.
     * Targets #dm-chat-content element.
     */
    scrollToBottom(): void {
        const container = document.getElementById('dm-chat-content');
        if (container) container.scrollTop = container.scrollHeight;
    }

    // === DATE FORMATTING ===
    /**
     * Compares two dates to check if they fall on the same calendar day.
     * @param d1 First date
     * @param d2 Second date
     * @returns True if same year, month, and day
     */
    isSameDate(d1: Date | undefined, d2: Date | undefined): boolean {
        if (!d1 || !d2) return false;
        return d1.getFullYear() === d2.getFullYear() &&
            d1.getMonth() === d2.getMonth() &&
            d1.getDate() === d2.getDate();
    }

    /**
     * Checks if given date is today.
     * @param date Date to check
     * @returns True if today
     */
    isToday(date: Date): boolean {
        return this.isSameDate(date, new Date());
    }

    /**
     * Checks if given date is yesterday.
     * @param date Date to check
     * @returns True if yesterday
     */
    isYesterday(date: Date): boolean {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        return this.isSameDate(date, yesterday);
    }

    /**
     * Formats date to long localized string (weekday, day, month).
     * @param date Date to format
     * @returns Localized long date string (de-DE)
     */
    formatDateLong(date: Date): string {
        return new Intl.DateTimeFormat('de-DE', {
            weekday: 'long',
            day: 'numeric',
            month: 'long'
        }).format(date);
    }

    /**
     * Returns human-readable display date: 'Today', 'Yesterday', or long format.
     * @param date Date to format
     * @returns Localized date string
     */
    getDisplayDate(date: Date | undefined): string {
        if (!date) return '';
        if (this.isToday(date)) return 'Today';
        if (this.isYesterday(date)) return 'Yesterday';
        return this.formatDateLong(date);
    }

    // === REACTIONS ===
    /**
     * Converts message reactions object to sorted array with counts.
     * @param message Message object with reactions property
     * @returns Array of {type, count} sorted alphabetically
     */
    getReactionArray(message: any): { type: string; count: number }[] {
        if (!message.reactions) return [];
        return Object.keys(message.reactions)
            .map(type => ({ type, count: message.reactions[type]?.length || 0 }))
            .filter(r => r.count > 0)
            .sort((a, b) => a.type.localeCompare(b.type));
    }

    /**
     * Returns visible reactions for message (max 7 or all if showAll).
     * @param message Message object
     * @param index Message index for showAllReactions lookup
     * @param showAllReactions Record of expanded reactions by index
     * @returns Array of visible reaction objects
     */
    getVisibleReactions(message: any, index: number, showAllReactions: Record<number, boolean>): { type: string; count: number }[] {
        const all = this.getReactionArray(message);
        const showAll = showAllReactions[index] ?? false;
        return showAll ? all : all.slice(0, 7);
    }

    /** Determines hover data for reactions based on user IDs who reacted. */
    getReactionHoverData(userIds: string[], currentUserUid: string | undefined, otherUser: { uid: string; name: string } | undefined): { type: 'self' | 'other' | 'both'; name?: string } | null {
        if (!userIds?.length) return null;
        const current = userIds.includes(currentUserUid || '');
        const other = userIds.includes(otherUser?.uid || '');
        if (currentUserUid === otherUser?.uid && current) { return { type: 'self' }; }
        const name = otherUser?.name || 'Unbekannt';
        if (current && !other) return { type: 'self' };
        if (!current && other) return { type: 'other', name };
        if (current && other) return { type: 'both', name };
        return null;
    }

    /** Renders message text by replacing smileys, mentions, and channel references with HTML. */
    renderMessage(text: string, users: Record<string, User>, channels: Channel[] = []): SafeHtml {
        if (!text) return '';
        let replaced = text;
        replaced = this.replaceSmileys(replaced);
        replaced = this.replaceSpecialMention(replaced, users);
        replaced = this.replaceGeneralMentions(replaced, users);
        replaced = this.replaceChannelMentions(replaced, channels);
        return this.sanitizer.bypassSecurityTrustHtml(replaced);
    }

    /**  Replaces :smiley: style smiley codes with corresponding <img> tags. */
    private replaceSmileys(text: string): string {
        return text.replace(/:([a-zA-Z0-9_+-]+):/g, (match, name) =>
            `<img src="assets/reaction-icons/${name}.svg" alt="${name}" class="inline-smiley">`
        );
    }

    /**  Replaces special mention patterns with corresponding HTML tags. */
    private replaceSpecialMention(text: string, users: Record<string, User>): string {
        return text.replace(/@Gastnutzer(?=\s|$|[^\w\s])/g, (match) => {
            const user = this.findUserByNormalizedName(users, 'gastnutzer');
            return user ? this.createMentionTag(match, user) : match;
        });
    }

    /**  Replaces general @mentions with corresponding HTML tags if user exists, otherwise leaves as is. */
    private replaceGeneralMentions(text: string, users: Record<string, User>): string {
        return text.replace(/@([A-Za-zÄÖÜäöüß]+(?:\s+[A-Za-zÄÖÜäöüß]+)?)(?=\s|$|[^\w\s])/g, (match, capturedName) => {
            if (capturedName.toLowerCase() === 'gastnutzer') {
                return match;
            }
            const user = this.findUserByNormalizedName(users, capturedName.trim().toLowerCase());
            return user ? this.createMentionTag(`@${capturedName}`, user) : match;
        });
    }

    /** Replaces #channel references with corresponding HTML tags if channel exists, otherwise leaves as is. */
    private replaceChannelMentions(text: string, channels: Channel[]): string {
        return text.replace(/#([A-Za-zÄÖÜäöüß0-9_-]+)(?=\s|$|[^\w\s])/g, (match, capturedName) => {
            const channel = channels.find(c =>
                c.name.trim().toLowerCase() === capturedName.toLowerCase()
            );
            if (channel) {
                return this.createChannelMentionTag(`#${capturedName}`, channel.id);
            }
            return match;
        });
    }

    /** Finds user by normalized name (trimmed, lowercased) in users map. */
    private findUserByNormalizedName(users: Record<string, User>, normalizedName: string): User | undefined {
        return Object.values(users).find(u =>
            u.name.trim().toLowerCase() === normalizedName
        );
    }

    /** Creates HTML span tag for user mention with embedded user data for tooltip and interaction. */
    private createMentionTag(displayText: string, user: User): string {
        const userData = JSON.stringify({
            id: user.uid,
            name: user.name,
            img: user.img || 'default-user'
        });
        return `<span class="mention-tag" data-user='${userData}' data-action="openUserChat" title="Doppelklick zum Öffnen des Benutzerchats">${displayText}</span>`;
    }

    /** Creates HTML span tag for channel mention with embedded channel data for tooltip and interaction. */
    private createChannelMentionTag(displayText: string, channelId: string): string {
        return `<span class="mention-tag channel-mention" data-channel-id="${channelId}" data-action="openChannel" title="Doppelklick zum Öffnen des Kanalchats">${displayText}</span>`;
    }

    /** Handles click events on mention tags to open user chats or channels based on embedded data attributes. */
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

    // === USER HELPERS ===
    /**
     * Converts full User object to minimal mention format for overlay.
     * @param u Complete User object
     * @returns Minimal user data for mentions {uid, name, img, presence}
     */
    toMentionUser(u: User): Pick<User, 'uid' | 'name' | 'img' | 'presence'> {
        return {
            uid: u.uid,
            name: u.name,
            img: u.img || 'default-user',
            presence: u.presence || 'offline'
        };
    }

    /**
     * Creates lookup map of users by UID for efficient access.
     * @param users Array of User objects
     * @returns Object map with UID as key, User as value
     */
    toUserMap(users: User[]): Record<string, User> {
        const userMap: Record<string, User> = {};
        users.forEach(u => userMap[u.uid] = u);
        return userMap;
    }
}
