import { Component, Output, EventEmitter, Input, inject, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RoundBtnComponent } from '../round-btn/round-btn.component';
import { Observable, of, take } from 'rxjs';
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
  @ViewChild('newMessageInput', { static: false }) newMessageInput!: ElementRef<HTMLTextAreaElement>;
  overlayActive = false;

  currentUserId: string = '';
  filteredChannels: any[] = []
  newMessage: string = '';
  mentionCaretIndex: number | null = null;
  cursorPos: number = 0;

  channelName$: Observable<string> = of('');
  participants$: Observable<User[]> = of([]);

  channelService = inject(ChannelService);
  userService = inject(UserService);

  ngOnInit() {
    this.getCurrentUser();
    // this.loadChannelWithId(this.channelId);
    // this.chat$ = this.getEnrichedChat();
    // this.answers$ = this.getEnrichedAnswers();

    // // this.answers$.pipe(take(1)).subscribe(answers => {
    // //   console.log('Thread Answers:', answers);
    // // });
    // this.answers$.pipe(take(1)).subscribe(() => {
    //   this.scrollToBottom();
    // });
  }

  getCurrentUser() {
    this.userService.getCurrentUser().pipe(take(1)).subscribe(user => {
      if (user) {
        this.currentUserId = user.uid;
        this.channelService.getChannels().pipe(take(1)).subscribe(channels => {
          this.filteredChannels = channels.filter(c =>
            Array.isArray(c.participants) && c.participants.includes(this.currentUserId)
          );
        });
      }
    });
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

  onEnterPress(e: KeyboardEvent) {
    if (this.overlayActive) {
      e.preventDefault();
      return;
    }

    this.submitChatMessage();
    e.preventDefault();
  }

  insertMention(event: { name: string; type: 'user' | 'channel' }) {
    const trigger = event.type === 'user' ? '@' : '#';
    const pos = this.mentionCaretIndex ?? this.newMessage.length;
    const before = this.newMessage.slice(0, pos);
    const after = this.newMessage.slice(pos);
    const replaced = before.replace(/([@#])([^\s]*)$/, `${trigger}${event.name}`);
    this.newMessage = replaced + ' ' + after;
    const textarea = this.newMessageInput.nativeElement;
    this.mentionCaretIndex = replaced.length + 1;

    setTimeout(() => {
      textarea.selectionStart = textarea.selectionEnd = this.mentionCaretIndex!;
      this.updateCaretPosition();
      textarea.focus();
    });
    this.overlayActive = false;
  }

  updateCaretPosition() {
    const textarea = this.newMessageInput?.nativeElement;
    if (!textarea) return;
    this.mentionCaretIndex = textarea.selectionStart;
  }

  updateEditCaret(chat: any, textarea: HTMLTextAreaElement) {
    chat._caretIndex = textarea.selectionStart;
  }

  // getTextarea(): HTMLTextAreaElement | null {
  //   return document.getElementById('chat-message') as HTMLTextAreaElement | null;
  // }

  insertMentionInEdit(
    chat: any,
    event: { name: string; type: 'user' | 'channel' }
  ) {
    const trigger = event.type === 'user' ? '@' : '#';
    const pos = chat._caretIndex ?? chat.editedText.length;
    const before = chat.editedText.slice(0, pos);
    const after = chat.editedText.slice(pos);
    const replaced = before.replace(/([@#])([^\s]*)$/, `${trigger}${event.name}`);
    chat.editedText = replaced + ' ' + after;
    chat._caretIndex = replaced.length + 1;
    setTimeout(() => {
      const textarea = document.getElementById(`edit-${chat.id}`) as HTMLTextAreaElement;
      if (textarea) {
        textarea.selectionStart = textarea.selectionEnd = chat._caretIndex;
        textarea.focus();
      }
    });
  }

  insertAtCursor(character: string = '@') {
    const textarea = this.newMessageInput.nativeElement;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = this.newMessage.slice(0, start);
    const after = this.newMessage.slice(end);
    this.newMessage = before + character + after;
    this.mentionCaretIndex = start + character.length;
    setTimeout(() => {
      textarea.selectionStart = textarea.selectionEnd = this.mentionCaretIndex!;
      textarea.focus();
    }); 0
  }

  autoGrow(el: HTMLTextAreaElement | null) {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }
}