import { Injectable } from "@angular/core";
import { DomSanitizer, SafeHtml } from "@angular/platform-browser";

@Injectable({ providedIn: 'root' })
export class ChatsTextService {
  constructor(private sanitizer: DomSanitizer) {}

  renderMessage(text: string): SafeHtml {
    if (!text) return '';

    const replaced = text.replace(/:([a-zA-Z0-9_+-]+):/g, (match, name) => {
      return `<img src="assets/reaction-icons/${name}.svg"
                  alt="${name}"
                  class="inline-smiley">`;
    });

    return this.sanitizer.bypassSecurityTrustHtml(replaced);
  }
  
  insertTextSimple(
    text: string,
    textarea: HTMLTextAreaElement,
    textRef: string | ((param: any) => string)
  ): number {
    const start = textarea.selectionStart ?? 0;
    const end = textarea.selectionEnd ?? 0;
    const currentText = typeof textRef === 'function' ? textRef(null) : textRef;

    const before = currentText.slice(0, start);
    const after = currentText.slice(end);
    const newText = before + text + after;

    if (typeof textRef === 'function') {
      textRef(newText);
    } else {
      (textRef as any) = newText;
    }

    return start + text.length;
  }
//   insertTextSimple(
//     text: string,
//     textarea: HTMLTextAreaElement,
//     getText: () => string,
//     setText: (value: string) => void
//   ): number {
//     const start = textarea.selectionStart ?? 0;
//     const end = textarea.selectionEnd ?? 0;
//     const currentText = getText();

//     const before = currentText.slice(0, start);
//     const after = currentText.slice(end);
//     const newText = before + text + after;

//     setText(newText);
//     return start + text.length;
//   }

  setCursorPosition(textarea: HTMLTextAreaElement, position: number) {
    setTimeout(() => {
      textarea.selectionStart = textarea.selectionEnd = position;
      textarea.focus();
    });
  }

  autoGrow(el: HTMLTextAreaElement | null) {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }
}