import { Component, Output, EventEmitter, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RoundBtnComponent } from '../round-btn/round-btn.component';
import { Observable, of } from 'rxjs';
import { ChannelService } from '../../services/channel.service';
import { UserService } from '../../services/user.service';
import { User } from '../../models/user.class';
import { MentionsOverlayComponent } from '../shared/mentions-overlay/mentions-overlay.component';

@Component({
  selector: 'app-new-message',
  imports: [CommonModule, FormsModule, RoundBtnComponent, MentionsOverlayComponent],
  templateUrl: './new-message.component.html',
  styleUrl: './new-message.component.scss'
})
export class NewMessageComponent {
  overlayActive = false;

  currentUserId: string = '';
  filteredChannels: any[] = []
  newMessage: string = '';
  cursorPos: number = 0;

  channelName$: Observable<string> = of('');
  participants$: Observable<User[]> = of([]);

  channelService = inject(ChannelService);
  userService = inject(UserService);

  onEnterPress(e: KeyboardEvent) {
    // if (this.overlayActive) {
    //   e.preventDefault();
    //   return;
    // }

    // this.submitChatMessage();
    // e.preventDefault();
  }

  submitChatMessage() {
    if (!this.newMessage.trim()) return;
    // if (!this.channelId || !this.currentUserId) return;

    // const messagePayload = {
    //   message: this.newMessage.trim(),
    //   time: Math.floor(Date.now() / 1000),
    //   user: this.currentUserId
    // };
    // this.channelService.addChatToChannel(this.channelId, messagePayload)
    //   .then(() => {
    //     this.newMessage = '';
    //     setTimeout(() => this.scrollToBottom());
    //   })
    //   .catch(err => {
    //     console.error('Fehler beim Senden:', err);
    //   });
  }

  onTextInput() {
    // const textarea = this.getTextarea();
    // // this.cursorPos = textarea ? textarea.selectionStart : 0;
    // if (textarea) {
    //   this.cursorPos = textarea.selectionStart;
    // }
  }

  insertMention(event: { name: string, type: 'user' | 'channel' }) {
    // const trigger = event.type === 'user' ? '@' : '#';
    // const textarea = this.getTextarea();
    // if (!textarea) return;

    // const cursorPos = textarea.selectionStart;
    // let value = this.newMessage;

    // // 1. Leerzeichen vor dem trigger am Cursor prüfen und ggf. einfügen
    // const { textWithSpace, updatedCursor } = this.ensureSpaceBeforeTrigger(value, cursorPos, trigger);

    // // 2. Mention-Text an Cursor-Position ersetzen
    // const { newText, caretPos } = this.replaceMentionAtCursor(textWithSpace, updatedCursor, trigger, event.name);

    // // 3. Wert updaten und Cursor setzen
    // this.newMessage = newText;
    // this.focusAndSetCursor(textarea, caretPos);

    // this.insertedAtPending = false;
  }

  addRecipientMention() {
    // if (this.insertedAtPending) return;

    // // Insert ' @' vor Cursor oder am Ende, wenn CursorPos nicht gesetzt
    // const textarea = this.getTextarea();
    // if (!textarea) return;
    
    // const cursorStart = textarea.selectionStart;
    // const before = this.newMessage.slice(0, cursorStart);
    // const after = this.newMessage.slice(cursorStart);

    // // Falls nötig vor @ Leerzeichen ergänzen
    // let insertText = '@';
    // if (before.length > 0 && before[before.length -1] !== ' ') {
    //   insertText = ' @';
    // }

    // this.newMessage = before + insertText + after;

    // // Neue Cursorposition hinter das eingefügte @ setzen
    // const newCursorPos = cursorStart + insertText.length;

    // this.cursorPos = newCursorPos;

    // setTimeout(() => {
    //   // Aktualisiere sichtbar das Textarea + Cursorposition
    //   textarea.focus();
    //   textarea.setSelectionRange(newCursorPos, newCursorPos);

    //   this.onTextInput();
    // });

    // this.insertedAtPending = true;
  }
}
