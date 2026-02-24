import { Injectable, inject } from "@angular/core";
import { ElementRef } from '@angular/core';
import { DomSanitizer, SafeHtml } from "@angular/platform-browser";

@Injectable({ providedIn: 'root' })
export class ThreadHelpService {
    sanitizer = inject(DomSanitizer);

    /** Inserts a smiley shortcode at the current cursor position and restores the caret. */
    insertSmiley(textarea: HTMLTextAreaElement, currentText: string, smiley: string): void {
        const result = this.insertTextAtPosition(textarea, `:${smiley}:`, currentText);
        textarea.value = result.newText;
        
        // Cursor positionieren
        setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = result.newCaretPosition;
        textarea.focus();
        });
    }

    /** Inserts text at the textarea cursor position and returns the updated text and caret position. */
    insertTextAtPosition(
        textarea: HTMLTextAreaElement, 
        textToInsert: string, 
        currentText: string,
        caretOffset: number = 0
    ): { newText: string; newCaretPosition: number } {
        const start = textarea.selectionStart ?? 0;
        const end = textarea.selectionEnd ?? 0;
        const before = currentText.slice(0, start);
        const after = currentText.slice(end);
        
        const newText = before + textToInsert + after;
        const newCaret = start + textToInsert.length + caretOffset;
        
        return { newText, newCaretPosition: newCaret };
    }

    /** Inserts or replaces a mention trigger (@ or #) with the selected entity and updates caret position. */
    insertMention(
        currentText: string, 
        mentionEvent: { name: string; type: 'user' | 'channel' | 'email' },
        caretIndex: number | null
    ): { newText: string; newCaretIndex: number } {
        const trigger = mentionEvent.type === 'user' ? '@' : '#';
        const pos = caretIndex ?? currentText.length;
        const before = currentText.slice(0, pos);
        const after = currentText.slice(pos);
        
        const replaced = before.replace(/([@#])([^\s]*)$/, `${trigger}${mentionEvent.name}`);
        const newText = replaced + ' ' + after;
        
        return {
        newText,
        newCaretIndex: replaced.length + 1
        };
    }

    /** Inserts or replaces a mention in edit mode and returns the updated text and caret position. */
    insertMentionInEdit(
        editedText: string,
        caretIndex: number | null,
        mentionEvent: { name: string; type: 'user' | 'channel' | 'email' }
    ): { newText: string; newCaretIndex: number } {
        const trigger = mentionEvent.type === 'user' ? '@' : '#';
        const pos = caretIndex ?? editedText.length;
        const before = editedText.slice(0, pos);
        const after = editedText.slice(pos);
        
        const replaced = before.replace(/([@#])([^\s]*)$/, `${trigger}${mentionEvent.name}`);
        const newText = replaced + ' ' + after;
        
        return {
        newText,
        newCaretIndex: replaced.length + 1
        };
    }

    /** Automatically adjusts the textarea height to fit its content. */
    autoGrow(el: HTMLTextAreaElement | null): void {
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = `${el.scrollHeight}px`;
    }
    
    /** Converts a chat timestamp (seconds) into a Date object. */
    getChatDate(chat: any): Date | undefined {
        return chat.time ? new Date(chat.time * 1000) : undefined;
    }

    /** Checks whether two Date objects represent the same calendar day. */
    isSameDate(d1: Date | undefined, d2: Date | undefined): boolean {
        if (!d1 || !d2) return false;
        return d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate();
    }

    /** Returns a localized display string for a date (today, yesterday, or formatted date). */
    getDisplayDate(date: Date | undefined): string {
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);

        if (this.isSameDate(date, today)) return 'Heute';
        if (this.isSameDate(date, yesterday)) return 'Gestern';
        return date!.toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' });
    }

    /** Determines whether a date separator should be shown for an answer. */
    shouldShowDateForAnswer(answers: any[], i: number, chat: any): boolean {
        if (i === 0) {
            return !this.isSameDate(this.getChatDate(chat), this.getChatDate(answers[i]));
        } else {
            return !this.isSameDate(this.getChatDate(answers[i]), this.getChatDate(answers[i - 1]));
        }
    }

    /** Converts smiley shortcodes in text into sanitized HTML image elements. */
    renderMessage(text: string): SafeHtml {
        if (!text) return '';

        const replaced = text.replace(/:([a-zA-Z0-9_+-]+):/g, (match, name) => {
        return `<img src="assets/reaction-icons/${name}.svg"
                    alt="${name}"
                    class="inline-smiley">`;
        });

        return this.sanitizer.bypassSecurityTrustHtml(replaced);
    }
}