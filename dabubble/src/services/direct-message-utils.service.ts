import { Injectable, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { User } from '../models/user.class';

@Injectable({ providedIn: 'root' })
export class DirectMessageUtilsService {
    private sanitizer = inject(DomSanitizer);

    insertTextAt(text: string, insert: string, start: number, end: number): string {
        return text.slice(0, start) + insert + text.slice(end);
    }

    getSelectionRange(textarea: HTMLTextAreaElement): { start: number; end: number } {
        return { start: textarea.selectionStart ?? 0, end: textarea.selectionEnd ?? 0 };
    }

    setCursorPosition(textarea: HTMLTextAreaElement, position: number): void {
        setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = position;
            textarea.focus();
        });
    }

    buildMentionText(text: string, pos: number, trigger: string, name: string): { replaced: string; after: string } {
        const before = text.slice(0, pos);
        const after = text.slice(pos);
        const replaced = before.replace(/([@#])([^\s]*)$/, `${trigger}${name}`);
        return { replaced, after };
    }

    focusTextareaAt(textarea: HTMLTextAreaElement, position: number): void {
        setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = position;
            textarea.focus();
        });
    }

    focusEditTextarea(messageId: string, position: number): void {
        setTimeout(() => {
            const textarea = document.getElementById(`edit-${messageId}`) as HTMLTextAreaElement;
            if (textarea) {
                textarea.selectionStart = textarea.selectionEnd = position;
                textarea.focus();
            }
        });
    }

    autoGrow(el: HTMLTextAreaElement | null): void {
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = `${el.scrollHeight}px`;
    }

    scrollToBottom(): void {
        const container = document.getElementById('dm-chat-content');
        if (container) container.scrollTop = container.scrollHeight;
    }

    isSameDate(d1: Date | undefined, d2: Date | undefined): boolean {
        if (!d1 || !d2) return false;
        return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
    }

    isToday(date: Date): boolean {
        return this.isSameDate(date, new Date());
    }

    isYesterday(date: Date): boolean {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        return this.isSameDate(date, yesterday);
    }

    formatDateLong(date: Date): string {
        return new Intl.DateTimeFormat('de-DE', { weekday: 'long', day: 'numeric', month: 'long' }).format(date);
    }

    getDisplayDate(date: Date | undefined): string {
        if (!date) return '';
        if (this.isToday(date)) return 'Heute';
        if (this.isYesterday(date)) return 'Gestern';
        return this.formatDateLong(date);
    }

    getReactionArray(message: any): { type: string; count: number }[] {
        if (!message.reactions) return [];
        return Object.keys(message.reactions)
            .map(type => ({ type, count: message.reactions[type]?.length || 0 }))
            .filter(r => r.count > 0)
            .sort((a, b) => a.type.localeCompare(b.type));
    }

    getVisibleReactions(message: any, index: number, showAllReactions: Record<number, boolean>): { type: string; count: number }[] {
        const all = this.getReactionArray(message);
        const showAll = showAllReactions[index] ?? false;
        return showAll ? all : all.slice(0, 7);
    }

    getReactionHoverText(userIds: string[], currentUserUid: string | undefined, otherUser: { uid: string; name: string } | undefined): string {
        if (!userIds?.length) return '';
        const current = userIds.includes(currentUserUid || '');
        const other = userIds.includes(otherUser?.uid || '');
        const name = otherUser?.name || 'Unbekannt';
        if (current && !other) return 'Du hast reagiert';
        if (!current && other) return `${name} hat reagiert`;
        if (current && other) return `${name} und Du haben reagiert`;
        return '';
    }

    renderMessage(text: string): SafeHtml {
        if (!text) return '';
        const replaced = text.replace(/:([a-zA-Z0-9_+-]+):/g, (match, name) => `<img src="assets/reaction-icons/${name}.svg" alt="${name}" class="inline-smiley">`);
        return this.sanitizer.bypassSecurityTrustHtml(replaced);
    }

    toMentionUser(u: User): Pick<User, 'uid' | 'name' | 'img' | 'presence'> {
        return { uid: u.uid, name: u.name, img: u.img || 'default-user', presence: u.presence || 'offline' };
    }

    toUserMap(users: User[]): Record<string, User> {
        const userMap: Record<string, User> = {};
        users.forEach(u => userMap[u.uid] = u);
        return userMap;
    }
}
