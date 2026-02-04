import { inject, Injectable } from "@angular/core";
import { DomSanitizer, SafeHtml } from "@angular/platform-browser";
import { reactionIcons } from '../app/reaction-icons';

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
  insertTextAtCursor(
    text: string,
    textarea: HTMLTextAreaElement,
    updateMessage: (newText: string) => void,
    setCaretCallback?: (pos: number) => void 
  ): number {
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

  /** Renders a message by replacing emoji shortcodes with sanitized HTML. */
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

  /** Returns cached or newly generated HTML for a single emoji shortcode. */
  private getEmojiHtml(name: string): string {
    if (!this.emojiCache.has(name)) {
      this.emojiCache.set(name, `<img src="assets/reaction-icons/${name}.svg" alt="${name}" class="inline-smiley">`);
    }
    return this.emojiCache.get(name)!;
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