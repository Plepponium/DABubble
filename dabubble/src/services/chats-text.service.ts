import { inject, Injectable } from "@angular/core";
import { DomSanitizer, SafeHtml } from "@angular/platform-browser";
import { reactionIcons } from '../app/reaction-icons';

@Injectable({ providedIn: 'root' })
export class ChatsTextService {
  private sanitizer = inject(DomSanitizer);
  private emojiCache = new Map<string, string>();   
  private messageCache = new Map<string, string>();
  
  constructor() {
    this.preCacheEmojis();
  }

  private preCacheEmojis() {
    reactionIcons.forEach(iconName => {
      const img = new Image();
      img.src = `assets/reaction-icons/${iconName}.svg`;
    });
  }

  insertTextAtCursor(
    text: string,
    textarea: HTMLTextAreaElement,
    updateMessage: (newText: string) => void  // ✅ CALLBACK statt this.newMessage
  ): number {
    const start = textarea.selectionStart ?? 0;
    const end = textarea.selectionEnd ?? 0;
    const currentText = textarea.value;  // ✅ textarea.value statt getText()

    const before = currentText.slice(0, start);
    const after = currentText.slice(end);
    const newText = before + text + after;

    updateMessage(newText);  // ✅ Component setzt newMessage!

    const caretPos = start + text.length;
    setTimeout(() => {
      textarea.selectionStart = textarea.selectionEnd = caretPos;
      textarea.focus();
    });
    return caretPos;
  }

  // renderMessage(text: string): SafeHtml {
  //   if (!text) return this.sanitizer.bypassSecurityTrustHtml('');

  //   // ✅ Sofortiger Cache-Hit
  //   if (this.messageCache.has(text)) {
  //     return this.messageCache.get(text)!;
  //   }

  //   const html = text.replace(/:([a-zA-Z0-9_+-]+):/g, (match, name) => {
  //     return this.getEmojiHtml(name);
  //   });

  //   const safeHtml = this.sanitizer.bypassSecurityTrustHtml(html);
  //   this.messageCache.set(text, safeHtml);  // ✅ Cache speichern
    
  //   return safeHtml;
  // }
  renderMessage(text: string): SafeHtml {
    if (!text) return this.sanitizer.bypassSecurityTrustHtml('');
    
    if (this.messageCache.has(text)) {
      return this.sanitizer.bypassSecurityTrustHtml(this.messageCache.get(text)!);
    }

    const html = text.replace(/:([a-zA-Z0-9_+-]+):/g, (match, name) => {
      return this.getEmojiHtml(name);
    });

    this.messageCache.set(text, html);
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  /** Holt oder cached einzelnes Emoji */
  // private getEmojiHtml(name: string): string {
  //   if (!this.emojiCache.has(name)) {
  //     const html = `<img src="assets/reaction-icons/${name}.svg" 
  //                         alt="${name}" 
  //                         class="inline-smiley">`;
  //     this.emojiCache.set(name, this.sanitizer.bypassSecurityTrustHtml(html));
  //   }
  //   return this.emojiCache.get(name)!.toString();
  // }
  private getEmojiHtml(name: string): string {
    if (!this.emojiCache.has(name)) {
      this.emojiCache.set(name, `<img src="assets/reaction-icons/${name}.svg" alt="${name}" class="inline-smiley">`);
    }
    return this.emojiCache.get(name)!;
  }

  /** Auto-Grow für Textareas */
  autoGrow(textarea: HTMLTextAreaElement): void {
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }

  /** Cache leeren (für Tests/Debug) */
  clearCache() {
    this.emojiCache.clear();
    this.messageCache.clear();
  }
}