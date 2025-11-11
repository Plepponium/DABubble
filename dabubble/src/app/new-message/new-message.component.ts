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
  // overlayActive = false;

  currentUserId: string = '';
  participants: User[] = [];
  filteredChannels: any[] = [];

  newMessage: string = '';
  recipientText: string = '';

  mentionCaretIndex: number | null = null;
  cursorPosRecipient: number = 0;
  cursorPosMessage: number = 0;
  
  overlayActiveRecipient = false;
  overlayActiveMessage = false;

  channelName$: Observable<string> = of('');
  participants$: Observable<User[]> = of([]);

  channelService = inject(ChannelService);
  userService = inject(UserService);

  ngOnInit() {
    this.getCurrentUserAndChannels();
    this.loadAllUsers();

    // console.log('currentUserId', this.currentUserId);
    

    // this.participants$ = this.userService.getUsers();
    // this.subscribeToParticipants();

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

  getCurrentUserAndChannels() {
    this.userService.getCurrentUser().pipe(take(1)).subscribe(user => {
      if (user) {
        this.currentUserId = user.uid;
        // console.log('currentUserId', this.currentUserId);
        this.channelService.getChannels().pipe(take(1)).subscribe(channels => {
          this.filteredChannels = channels.filter(c =>
            Array.isArray(c.participants) && c.participants.includes(this.currentUserId)
          );
        });
      }
    });
  }

  loadAllUsers() {
    this.userService.getUsers().pipe(take(1)).subscribe(users => {
      this.participants$ = of(users);   // optional, falls das Overlay ein Observable erwartet
      this.participants = users;        // falls du sie lokal brauchst
      console.log('🔹 Alle User geladen:', users.length);
      console.log('participants', this.participants);
    });
  }

 
  

  // insertMention(event: { name: string; type: 'user' | 'channel' }) {
  //   const trigger = event.type === 'user' ? '@' : '#';
  //   const pos = this.mentionCaretIndex ?? this.newMessage.length;
  //   const before = this.newMessage.slice(0, pos);
  //   const after = this.newMessage.slice(pos);
  //   const replaced = before.replace(/([@#])([^\s]*)$/, `${trigger}${event.name}`);
  //   this.newMessage = replaced + ' ' + after;
  //   const textarea = this.newMessageInput.nativeElement;
  //   this.mentionCaretIndex = replaced.length + 1;

  //   setTimeout(() => {
  //     textarea.selectionStart = textarea.selectionEnd = this.mentionCaretIndex!;
  //     this.updateCaretPosition();
  //     textarea.focus();
  //   });
  //   this.overlayActive = false;
  // }
  // insertMention(event: { name: string; type: 'user' | 'channel' }) {
  //   const trigger = event.type === 'user' ? '@' : '#';
  //   const activeElement = document.activeElement as HTMLInputElement | HTMLTextAreaElement | null;

  //   if (!activeElement) return;

  //   let text = '';
  //   let caretIndex = 0;
  //   let overlayFlag: 'recipient' | 'message' | null = null;

  //   if (activeElement.id === 'recipient') {
  //     text = this.recipientText;
  //     caretIndex = this.cursorPosRecipient;
  //     overlayFlag = 'recipient';
  //   } else if (activeElement.id === 'new-message') {
  //     text = this.newMessage;
  //     caretIndex = this.cursorPosMessage;
  //     overlayFlag = 'message';
  //   }

  //   if (!overlayFlag) return;

  //   // Mention einfügen
  //   const before = text.slice(0, caretIndex);
  //   const after = text.slice(caretIndex);
  //   const replaced = before.replace(/([@#])([^\s]*)$/, `${trigger}${event.name}`);
  //   const updatedText = replaced + ' ' + after;

  //   if (overlayFlag === 'recipient') {
  //     this.recipientText = updatedText;
  //     this.cursorPosRecipient = replaced.length + 1;
  //     this.overlayActiveRecipient = false;
  //   } else {
  //     this.newMessage = updatedText;
  //     this.cursorPosMessage = replaced.length + 1;
  //     this.overlayActiveMessage = false;
  //   }

  //   // Caret nach Einfügen neu setzen
  //   setTimeout(() => {
  //     activeElement.selectionStart = activeElement.selectionEnd = (overlayFlag === 'recipient')
  //       ? this.cursorPosRecipient
  //       : this.cursorPosMessage;
  //     activeElement.focus();
  //   });
  // }
  // insertMention(event: { name: string; type: 'user' | 'channel' }) {
  //   const trigger = event.type === 'user' ? '@' : '#';
  //   const pos = this.mentionCaretIndex ?? this.newMessage.length;

  //   const before = this.newMessage.slice(0, pos);
  //   const after = this.newMessage.slice(pos);
  //   const replaced = before.replace(/([@#])([^\s]*)$/, `${trigger}${event.name}`);

  //   this.newMessage = replaced + ' ' + after;
  //   this.mentionCaretIndex = replaced.length + 1;

  //   // Fokus und Cursor setzen
  //   const textarea = this.newMessageInput.nativeElement;
  //   setTimeout(() => {
  //     textarea.selectionStart = textarea.selectionEnd = this.mentionCaretIndex!;
  //     textarea.focus();
  //   });

  //   this.overlayActiveMessage = false;
  // }
  insertMention(event: { name: string; type: 'user' | 'channel' }, type: 'recipient' | 'message') {
    const trigger = event.type === 'user' ? '@' : '#';
    const pos = this.mentionCaretIndex ?? (type === 'recipient' ? this.recipientText.length : this.newMessage.length);

    let text = type === 'recipient' ? this.recipientText : this.newMessage;
    const before = text.slice(0, pos);
    const after = text.slice(pos);
    const replaced = before.replace(/([@#])([^\s]*)$/, `${trigger}${event.name}`);
    text = replaced + ' ' + after;

    if (type === 'recipient') this.recipientText = text;
    else this.newMessage = text;

    this.mentionCaretIndex = replaced.length + 1;

    // Fokus und Cursor setzen
    setTimeout(() => {
      const el = type === 'recipient' ? document.getElementById('recipient') as HTMLInputElement
                                      : this.newMessageInput.nativeElement;
      if (el) el.selectionStart = el.selectionEnd = this.mentionCaretIndex!;
      el?.focus();
    });

    // Overlay schließen
    // if (type === 'recipient') this.overlayActiveRecipient = false;
    // else this.overlayActiveMessage = false;
    this.overlayActiveRecipient = false;
    this.overlayActiveMessage = false;
  }


  // updateCaretPosition() {
  //   const textarea = this.newMessageInput?.nativeElement;
  //   if (!textarea) return;
  //   this.mentionCaretIndex = textarea.selectionStart;
  // }
  updateCaretPosition(event: any, type: 'recipient' | 'message') {
    const target = event.target as HTMLInputElement | HTMLTextAreaElement;
    const caretPos = target.selectionStart || 0;

    if (type === 'recipient') {
      this.cursorPosRecipient = caretPos;
    } else {
      this.cursorPosMessage = caretPos;
    }
    this.mentionCaretIndex = caretPos;
  }

  updateEditCaret(chat: any, textarea: HTMLTextAreaElement) {
    chat._caretIndex = textarea.selectionStart;
  }

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
        console.log('Message submitted:', this.newMessage);
        this.recipientText = '';
        this.newMessage = '';
    //     setTimeout(() => this.scrollToBottom());
    //   })
    //   .catch(err => {
    //     console.error('Fehler beim Senden:', err);
    //   });
  }

  onEnterPress(e: KeyboardEvent) {
    if (this.overlayActiveRecipient || this.overlayActiveMessage) {
    // if (this.overlayActive) {
      e.preventDefault();
      return;
    }

    this.submitChatMessage();
    e.preventDefault();
  }

  autoGrow(el: HTMLTextAreaElement | null) {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }
}