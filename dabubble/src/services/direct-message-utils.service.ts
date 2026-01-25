import { Injectable, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { User } from '../models/user.class';

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

    /**
     * Generates hover tooltip text for reactions based on reacting users.
     * @param userIds Array of user IDs who reacted
     * @param currentUserUid Current user's UID
     * @param otherUser Chat partner {uid, name}
     * @returns Descriptive hover text (e.g. "You reacted", "John and You reacted")
     */
    getReactionHoverText(
        userIds: string[],
        currentUserUid: string | undefined,
        otherUser: { uid: string; name: string } | undefined
    ): string {
        if (!userIds?.length) return '';
        const current = userIds.includes(currentUserUid || '');
        const other = userIds.includes(otherUser?.uid || '');
        const name = otherUser?.name || 'Unknown';
        if (current && !other) return 'You reacted';
        if (!current && other) return `${name} reacted`;
        if (current && other) return `${name} and You reacted`;
        return '';
    }

    // === RENDERING ===
    /**
     * Converts text content to SafeHtml with emoji icon replacements.
     * Replaces :emoji: with <img> tags.
     * @param text Raw message text
     * @returns Sanitized HTML string with replaced emojis
     */
    renderMessage(text: string): SafeHtml {
        if (!text) return '';
        const replaced = text.replace(/:([a-zA-Z0-9_+-]+):/g, (match, name) =>
            `<img src="assets/reaction-icons/${name}.svg" alt="${name}" class="inline-smiley">`
        );
        return this.sanitizer.bypassSecurityTrustHtml(replaced);
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
