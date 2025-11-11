import { Component, Output, EventEmitter, Input, inject, ViewChild, ElementRef, HostListener } from '@angular/core';
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
  @ViewChild('recipientInput', { static: false }) recipientInput!: ElementRef<HTMLInputElement>;
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

  insertMention(event: { name: string; type: 'user' | 'channel' }, type: 'recipient' | 'message' = 'message') {
    const el = this.getInputElement(type);
    if (!el) return;

    const { text, caretIndex } = this.getCurrentTextAndCaret(type);
    const { newText, newCaretIndex } = this.insertMentionInText(text, event, caretIndex);

    this.setText(type, newText);
    this.mentionCaretIndex = newCaretIndex;

    this.focusAndMoveCaret(el, newCaretIndex);
    this.closeInputOverlay(type);
  }

  private getInputElement(type: 'recipient' | 'message'): HTMLInputElement | HTMLTextAreaElement | null {
    return type === 'recipient'
      ? document.getElementById('recipient') as HTMLInputElement
      : this.newMessageInput.nativeElement;
  }

  /** 2. Liest den aktuellen Text und Caret-Index */
  private getCurrentTextAndCaret(type: 'recipient' | 'message'): { text: string, caretIndex: number } {
    const text = type === 'recipient' ? this.recipientText : this.newMessage;
    const caretIndex = this.mentionCaretIndex ?? text.length;
    return { text, caretIndex };
  }

  private insertMentionInText(
    text: string,
    mention: { name: string; type: 'user' | 'channel' },
    caretIndex: number | null
  ): { newText: string, newCaretIndex: number } {
    const trigger = mention.type === 'user' ? '@' : '#';
    const pos = caretIndex ?? text.length;
    const before = text.slice(0, pos);
    const after = text.slice(pos);
    const replaced = before.replace(/([@#])([^\s]*)$/, `${trigger}${mention.name}`);
    const newText = replaced + ' ' + after;
    const newCaretIndex = replaced.length + 1;
    return { newText, newCaretIndex };
  }

  private setText(type: 'recipient' | 'message', text: string) {
    if (type === 'recipient') this.recipientText = text;
    else this.newMessage = text;
  }

  private focusAndMoveCaret(el: HTMLInputElement | HTMLTextAreaElement, caretPos: number) {
    setTimeout(() => {
      el.selectionStart = el.selectionEnd = caretPos;
      el.focus();
    });
  }

  private closeInputOverlay(type: 'recipient' | 'message') {
    if (type === 'recipient') this.overlayActiveRecipient = false;
    else this.overlayActiveMessage = false;
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

  // @HostListener('document:click', ['$event'])
  // onDocumentClick(event: MouseEvent) {
  //   const target = event.target as HTMLElement;

  //   // Recipient Input + Overlay
  //   const recipientInputEl = this.recipientInput?.nativeElement;
  //   const recipientOverlayEl = document.querySelector('#recipient + app-mentions-overlay'); // Overlay direkt nach Input

  //   if (this.overlayActiveRecipient && recipientInputEl && recipientOverlayEl) {
  //     const clickedInsideRecipient = recipientInputEl.contains(target) || recipientOverlayEl.contains(target);
  //     if (!clickedInsideRecipient) {
  //       this.overlayActiveRecipient = false;
  //     }
  //   }

  //   // Message Textarea + Overlay
  //   const messageInputEl = this.newMessageInput?.nativeElement;
  //   const messageOverlayEl = document.querySelector('#new-message + app-mentions-overlay'); // Overlay direkt nach Textarea

  //   if (this.overlayActiveMessage && messageInputEl && messageOverlayEl) {
  //     const clickedInsideMessage = messageInputEl.contains(target) || messageOverlayEl.contains(target);
  //     if (!clickedInsideMessage) {
  //       this.overlayActiveMessage = false;
  //     }
  //   }
  // }

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