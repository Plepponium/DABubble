import { Component, EventEmitter, Input, Output, ViewChild, ElementRef } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MentionsOverlayComponent } from '../shared/mentions-overlay/mentions-overlay.component';
import { SmileyOverlayComponent } from '../shared/smiley-overlay/smiley-overlay.component';
import { RoundBtnComponent } from '../round-btn/round-btn.component';
import { User } from '../../models/user.class';

@Component({
  selector: 'app-chat-input',
  imports: [CommonModule, FormsModule, MentionsOverlayComponent, SmileyOverlayComponent, RoundBtnComponent],
  templateUrl: './chat-input.component.html',
  styleUrl: './chat-input.component.scss'
})
export class ChatInputComponent {
  @Input() placeholder: string = '';
  @Input() text: string = '';
  @Output() textChange = new EventEmitter<string>();

  @Input() emojis: string[] = [];
  @Input() users: User[] = [];
  @Input() channels: any[] = [];
  @Input() currentUserId: string = '';
  @Input() context: 'Channel' = 'Channel';

  @Output() submit = new EventEmitter<void>();

  // @ViewChild('inputRef') inputRef!: ElementRef<HTMLTextAreaElement>;

  activeSmiley = false;
  overlayActive = false;
  mentionCaretIndex: number | null = null;

  onFormSubmit(form: NgForm) {
    if (!this.text?.trim()) return;
    this.submit.emit();
  }

  onEnterPress(e: KeyboardEvent) {
    if (this.overlayActive) {
      e.preventDefault();
      return;
    }
    this.submit.emit();
    e.preventDefault();
  }

  openSmileyOverlay() {
    this.activeSmiley = !this.activeSmiley;
  }

  // onSmileySelected(smiley: string, textarea: HTMLTextAreaElement) {
  //   this.insertAtCursor(`:${smiley}:`, textarea);
  //   this.activeSmiley = false;
  // }
  onSmileySelected(smiley: string) {
  const textarea = document.getElementById('chat-input') as HTMLTextAreaElement;
  if (textarea) {
    this.insertAtCursor(`:${smiley}:`, textarea);
  }
  this.activeSmiley = false;
}

  insertMention(event: { name: string; type: 'user' | 'channel' | 'email' }) {
    const trigger = event.type === 'user' ? '@' : '#';
    const mentionText = `${trigger}${event.name} `;
    const pos = this.mentionCaretIndex ?? this.text.length;
    const before = this.text.slice(0, pos);
    const replaced = before.replace(/([@#])([^\s]*)$/, mentionText);

    const newText = replaced + this.text.slice(pos);
    this.text = newText;
    this.textChange.emit(this.text);

    this.mentionCaretIndex = replaced.length + 1;

    setTimeout(() => {
      const textarea = document.getElementById('chat-input') as HTMLTextAreaElement;
      if (textarea) {
        textarea.selectionStart = textarea.selectionEnd = this.mentionCaretIndex!;
        textarea.focus();
      }
    });
    this.overlayActive = false;
  }

  // updateCaretPosition() {
  //   const textarea = this.inputRef?.nativeElement;
  //   if (!textarea) return;
  //   this.mentionCaretIndex = textarea.selectionStart ?? 0;
  // }
  updateCaretPosition(textarea: HTMLTextAreaElement) {
    this.mentionCaretIndex = textarea.selectionStart ?? 0;
  }

  focusInput(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (target.closest('.input-icon-bar') || target.tagName === 'TEXTAREA') {
      return;
    }
    const textarea = document.getElementById('chat-input') as HTMLTextAreaElement;
    textarea?.focus();
  }

  insertAtCursor(character: string, textarea: HTMLTextAreaElement) {
    const start = textarea.selectionStart ?? 0;
    const end = textarea.selectionEnd ?? 0;
    const before = this.text.slice(0, start);
    const after = this.text.slice(end);
    this.text = before + character + after;
    this.textChange.emit(this.text);

    const newPos = start + character.length;
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = newPos;
    });
  }

  onOverlayStateChange(active: boolean) {
    this.overlayActive = active;
  }
}
