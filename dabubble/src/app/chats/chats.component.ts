import { Component, Output, EventEmitter, Input, inject, OnChanges, SimpleChanges, OnInit, ViewChild, ElementRef, AfterViewInit, HostListener, ViewChildren, QueryList, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, registerLocaleData } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { RoundBtnComponent } from '../round-btn/round-btn.component';
import { DialogueOverlayComponent } from '../dialogue-overlay/dialogue-overlay.component';
import { ChatAddUserOverlayComponent } from '../chat-add-user-overlay/chat-add-user-overlay.component';
import { ChannelDescriptionOverlayComponent } from '../channel-description-overlay/channel-description-overlay.component';
import { ChannelService } from '../../services/channel.service';
import { UserService } from '../../services/user.service';
import { User } from '../../models/user.class';
import { Chat } from '../../models/chat.class';
import { BehaviorSubject, combineLatest, firstValueFrom, forkJoin, map, Observable, of, Subject, switchMap, take, takeUntil } from 'rxjs';
import { reactionIcons } from '../reaction-icons';
import localeDe from '@angular/common/locales/de';
import { MentionsOverlayComponent } from '../shared/mentions-overlay/mentions-overlay.component';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { SmileyOverlayComponent } from "../shared/smiley-overlay/smiley-overlay.component";
import { RawReactionsMap, TransformedReaction } from '../../models/reaction.types';
import { ChatsReactionService } from '../../services/chats-reaction.service';
import { LogoutService } from '../../services/logout.service';
import { ChatsDataService } from '../../services/chats-data.service';
import { ChatsTextService } from '../../services/chats-text.service';
import { ChatsUiService } from '../../services/chats-ui.service';
import { ChannelHeaderComponent } from "../channel-header/channel-header.component";
import { ChatInputComponent } from "../chat-input/chat-input.component";
registerLocaleData(localeDe);

@Component({
  selector: 'app-chats',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, MatFormFieldModule, MentionsOverlayComponent, MatInputModule, MatIconModule, MatButtonModule, RoundBtnComponent, ChannelHeaderComponent, ChatInputComponent],
  templateUrl: './chats.component.html',
  styleUrl: './chats.component.scss',
})
export class ChatsComponent implements OnInit, OnChanges {
  channelService = inject(ChannelService);
  userService = inject(UserService);
  logoutService = inject(LogoutService);
 
  dataService = inject(ChatsDataService);
  textService = inject(ChatsTextService);
  reactionService = inject(ChatsReactionService);
  uiService = inject(ChatsUiService);

  value = 'Clear me';
  showChannelDescription = false;
  
  editCommentDialogueExpanded = false;
  activeReactionDialogueIndex: number | null = null;
  activeReactionDialogueBelowIndex: number | null = null;
  overlayActive = false;
  insertedAtPending = false;
  isResponsive = false;
  pendingScroll = false;
  activeSmiley = false;

  currentUserId: string = '';
  // channels: any[] = [];
  filteredChannels: any[] = []
  participantIds: string[] = [];
  participants: User[] = [];
  channelChats: any[] = [];
  reactionIcons = reactionIcons;
  reactionArray: { type: string, count: number, user: string[] }[] = [];
  newMessage: string = '';
  mentionCaretIndex: number | null = null;
  showAllReactions: { [index: number]: boolean } = {};

  channelName$: Observable<string> = of('');
  participants$: Observable<User[]> = of([]);
  private chatsSubject = new BehaviorSubject<Chat[]>([]);
  public chats$ = this.chatsSubject.asObservable();
  // private destroy$ = this.logoutService.logout$;
  private destroy$ = new Subject<void>(); 
  showChannelDescription$ = this.uiService.showChannelDescription$;
  showUserDialogue$ = this.uiService.showUserDialogue$;

  @Input() channelId?: string;
  @Input() profileOpen = false;
  @Output() openThread = new EventEmitter<{ channelId: string; chatId: string }>();
  @Output() openProfile = new EventEmitter<User>();
  @Output() channelDeleted = new EventEmitter<void>();
  @ViewChild('messageInput') messageInput!: ElementRef<HTMLTextAreaElement>;
  @ViewChildren('chatSection') chatSections!: QueryList<ElementRef<HTMLElement>>;

  @HostListener('window:resize')
  onResize() {
    // this.updateIsResponsive();
    this.uiService.setResponsive(window.innerWidth < 881);
  }

  private updateIsResponsive() {
    this.isResponsive = window.innerWidth < 881;
  }

  focusInput(event: MouseEvent) {
    if (event.target === this.messageInput?.nativeElement ||
      event.target instanceof HTMLElement &&
      event.target.closest('.input-icon-bar')) {
      return;
    }

    this.messageInput?.nativeElement?.focus();
  }

  getMaxReactionsToShow(chat: any, index: number): any[] {
    const max = this.isResponsive ? 3 : 7;
    return this.showAllReactions[index]
      ? chat.reactionArray
      : chat.reactionArray.slice(0, max);
  }

  // scrollToBottom() {
  //   const chatHistory = document.getElementById('chat-history');
  //   if (chatHistory) {
  //     chatHistory.scrollTop = chatHistory.scrollHeight;
  //   }
  // }

  trackByChatId(chat: any): string {
    return chat.id;
  }

  ngOnInit() {
    this.updateIsResponsive();
    this.dataService.getCurrentUser();
    this.dataService.loadChannels();

    this.participants$ = this.dataService.participants$;
    this.dataService.currentUserId$.pipe(takeUntil(this.destroy$)).subscribe(id => this.currentUserId = id);
    this.participants$.pipe(takeUntil(this.destroy$)).subscribe(p => this.participants = p);

    if ((this.dataService as any).filteredChannels$) {
      (this.dataService as any).filteredChannels$.pipe(takeUntil(this.destroy$)).subscribe((fc: any[]) => this.filteredChannels = fc);
    } else {
      this.filteredChannels = this.dataService.filteredChannels;
    }
    this.uiService.isResponsive$.pipe(takeUntil(this.destroy$)).subscribe(isResponsive => {
      this.isResponsive = isResponsive;  // Falls noch lokal benötigt
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['channelId']) {
      const newChannelId = changes['channelId'].currentValue;
      if (newChannelId) {
        this.pendingScroll = true;
        this.dataService.channelId = newChannelId;
        this.dataService.pendingScroll = true;
        this.dataService.currentUserId = this.currentUserId;

        this.dataService.loadChannelWithId(newChannelId);

        this.channelName$ = this.dataService.channelName$;
        this.participants$ = this.dataService.participants$;
        this.chats$ = this.dataService.chatsSubject.asObservable();
        // this.participants = this.dataService.participants;
        this.filteredChannels = this.dataService.filteredChannels;
      }
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getChatDate(chat: any): Date | undefined {
    return chat.time ? new Date(chat.time * 1000) : undefined;
  }

  isSameDate(d1: Date | undefined, d2: Date | undefined): boolean {
    if (!d1 || !d2) return false;
    return d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate();
  }
  
  getDisplayDate(chat: any): string {
    return this.uiService.getDisplayDate(chat.time);
  }



  // openReactionsDialogue(chatIndex: number, below: boolean) {
  //   if (this.activeReactionDialogueIndex === chatIndex) {
  //     this.activeReactionDialogueIndex = null;
  //   } else {
  //     this.editCommentDialogueExpanded = false;
  //     this.activeReactionDialogueIndex = chatIndex;
  //     this.activeReactionDialogueBelowIndex = null;
  //   }
  // }
  // openReactionsDialogue(chatIndex: number, below: boolean) {
  //   this.uiService.setReactionDialogue(chatIndex, below);
  // }

  // openReactionsDialogueBelow(chatIndex: number) {
  //   if (this.activeReactionDialogueBelowIndex === chatIndex) {
  //     this.activeReactionDialogueBelowIndex = null;
  //   } else {
  //     this.editCommentDialogueExpanded = false;
  //     this.activeReactionDialogueBelowIndex = chatIndex;
  //     this.activeReactionDialogueIndex = null;
  //   }
  // }
  openReactionsDialogue(index: number, below: boolean) {
    const currentIndex = below
      ? this.activeReactionDialogueBelowIndex
      : this.activeReactionDialogueIndex;

    const newIndex = currentIndex === index ? null : index;

    if (below) {
      this.activeReactionDialogueBelowIndex = newIndex;
      if (newIndex !== null) {
        this.activeReactionDialogueIndex = null;
      }
    } else {
      this.activeReactionDialogueIndex = newIndex;
      if (newIndex !== null) {
        this.activeReactionDialogueBelowIndex = null;
      }
    }
  }

  async addReaction(chatIndex: number, reactionType: string) {
    const chats = this.chatsSubject.getValue();
    const chat = chats[chatIndex];
    if (!chat) return;

    this.activeReactionDialogueIndex = null;
    this.activeReactionDialogueBelowIndex = null;

    const currentReactionUsers = chat.reactions?.[reactionType] || [];
    if (!currentReactionUsers.includes(this.currentUserId)) {
      const updatedUsers = [...currentReactionUsers, this.currentUserId];
      await this.channelService.setReaction(this.channelId!, chat.id, reactionType, updatedUsers);
      // this.updateLocalReaction(
      this.reactionService.updateLocalReaction(
        chat, reactionType, updatedUsers, chatIndex,
        this.chatsSubject, this.participants, this.currentUserId
      );
    }
  }

  async toggleReaction(chatIndex: number, reactionType: string) {
    const chat = await this.getChatByIndex(chatIndex);
    if (!chat) return;

    // const currentUsers = this.extractUserIds(chat.reactions || {}, reactionType);
    const currentUsers = this.reactionService.extractUserIds(chat.reactions || {}, reactionType);  // ← Service!
    let updatedUsers: string[];
    if (currentUsers.includes(this.currentUserId)) {
      updatedUsers = currentUsers.filter(uid => uid !== this.currentUserId);
    } else {
      updatedUsers = [...currentUsers, this.currentUserId];
    }

    await this.channelService.setReaction(this.channelId!, chat.id, reactionType, updatedUsers);
    // this.updateLocalReaction(chat, reactionType, updatedUsers, chatIndex);
    this.reactionService.updateLocalReaction(
      chat, reactionType, updatedUsers, chatIndex,
      this.chatsSubject, this.participants, this.currentUserId
    ); 
  }


  private async getChatByIndex(chatIndex: number): Promise<any> {
    if (this.channelChats && this.channelChats.length > chatIndex) {
      return this.channelChats[chatIndex];
    }
    const chats = await firstValueFrom(this.chats$.pipe(
      takeUntil(this.destroy$)
    ));
    return chats?.[chatIndex];
  }


  openAddComment(chat: Chat) {
    if (!this.channelId) return;

    this.openThread.emit({
      channelId: this.channelId,
      chatId: chat.id
    });
  }

  openEditCommentDialogue() {
    this.activeReactionDialogueIndex = null;
    this.editCommentDialogueExpanded = !this.editCommentDialogueExpanded;
  }



  closeDialogChannelDescription() {
    this.showChannelDescription = false;
  }


  openDialogueShowProfile(user: User) {
    this.profileOpen = true;
    this.openProfile.emit(user);
  }

  // onEnterPress(e: KeyboardEvent) {
  //   if (this.overlayActive) {
  //     e.preventDefault();
  //     return;
  //   }
  //   this.submitChatMessage();
  //   e.preventDefault();
  // }

  submitChatMessage() {
    if (!this.canSendMessage()) return;

    const messagePayload = this.buildMessagePayload();

    this.channelService.addChatToChannel(this.channelId!, messagePayload)
      .then(() => {
        this.newMessage = '';
        setTimeout(() => this.uiService.scrollToBottom());
      })
      .catch(err => {
        console.error('Fehler beim Senden:', err);
      });
  }

  private canSendMessage(): boolean {
    if (!this.newMessage?.trim()) return false;
    if (!this.channelId || !this.currentUserId) return false;
    return true;
  }

  private buildMessagePayload() {
    return {
      message: this.newMessage.trim(),
      time: Math.floor(Date.now() / 1000),
      user: this.currentUserId
    };
  }

  handleOpenThread(chatId: string) {
    if (!this.channelId) return;
    this.openThread.emit({ channelId: this.channelId, chatId });
  }

  handleOpenProfile(chat: Chat) {
    const user = this.participants.find(u => u.uid === chat.user);
    if (user) {
      this.openProfile.emit(user);
    }
  }

  handleAnswerAdded(event: { chatId: string; answerTime: number }) {
    this.chatsSubject.next(
      this.chatsSubject.getValue().map(chat =>
        chat.id === event.chatId
          ? {
            ...chat,
            answersCount: (chat.answersCount || 0) + 1,
            lastAnswerTime: event.answerTime
          }
          : chat
      )
    );
  }

  openSmileyOverlay() {
    this.activeSmiley = !this.activeSmiley;
  }

  onSmileySelected(smiley: string, el: HTMLTextAreaElement) {
    this.textService.insertTextAtCursor(`:${smiley}:`, el, (newText) => {
      this.newMessage = newText;  // ✅ Component setzt selbst!
    });
    this.activeSmiley = false;
  }

  insertMention(event: { name: string; type: 'user' | 'channel' | 'email' }) {
    const trigger = event.type === 'user' ? '@' : '#';
    const mentionText = `${trigger}${event.name} `;
    const pos = this.mentionCaretIndex ?? this.newMessage.length;
    const before = this.newMessage.slice(0, pos);
    const replaced = before.replace(/([@#])([^\s]*)$/, mentionText);

    this.newMessage = replaced + this.newMessage.slice(pos);
    this.mentionCaretIndex = replaced.length + 1;

    setTimeout(() => {
      const textarea = this.messageInput.nativeElement;
      textarea.selectionStart = textarea.selectionEnd = this.mentionCaretIndex!;
      textarea.focus();
    });
    this.overlayActive = false;
  }

  updateCaretPosition() {
    const textarea = this.messageInput?.nativeElement;
    if (!textarea) return;
    this.mentionCaretIndex = textarea.selectionStart ?? 0;
  }

  updateEditCaret(chat: any, textarea: HTMLTextAreaElement) {
    chat._caretIndex = textarea.selectionStart;
  }

  insertMentionInEdit(chat: any, event: { name: string; type: 'user' | 'channel' | 'email' }) {
    const trigger = event.type === 'user' ? '@' : '#';
    const mentionText = `${trigger}${event.name} `;

    const pos = chat._caretIndex ?? chat.editedText.length;
    const before = chat.editedText.slice(0, pos);
    const replaced = before.replace(/([@#])([^\s]*)$/, mentionText);

    chat.editedText = replaced + ' ' + chat.editedText.slice(pos);
    chat._caretIndex = replaced.length + 1;

    setTimeout(() => {
      const textarea = document.getElementById(`edit-${chat.id}`) as HTMLTextAreaElement;
      textarea?.focus();
      textarea && (textarea.selectionStart = textarea.selectionEnd = chat._caretIndex);
    });
  }

  insertAtCursor(character: string = '@', messageInput: HTMLTextAreaElement) {
    this.textService.insertTextAtCursor(character, messageInput, (newText) => {
      this.newMessage = newText;
    }, (caretPos) => {
      this.mentionCaretIndex = caretPos; 
    });
  }

  enableEditChat(chat: any) {
    this.editCommentDialogueExpanded = false;
    this.chatsSubject.getValue().forEach(c => c.isEditing = false);
    chat.isEditing = true;
    chat.editedText = chat.message;
    this.focusAndAutoGrow(chat.id);
  }

  cancelEditChat(chat: any) {
    chat.isEditing = false;
    chat.editedText = chat.message;
  }

  async saveEditedChat(chat: any) {
    const newText = chat.editedText.trim();
    if (!newText || newText === chat.message) {
      chat.isEditing = false;
      return;
    }

    this.updateChatMessage({ messageId: chat.id, newText });
    chat.isEditing = false;
  }

  async updateChatMessage(event: { messageId: string; newText: string }) {
    if (!this.channelId || !event.messageId || !event.newText.trim()) return;

    try {
      await this.channelService.updateChatMessage(this.channelId, event.messageId, event.newText.trim());
    } catch (err) {
      console.error('Fehler beim Aktualisieren der Nachricht:', err);
    }
  }

  focusAndAutoGrow(messageId: string) {
    setTimeout(() => {
      const ta = document.getElementById(`edit-${messageId}`) as HTMLTextAreaElement | null;
      if (ta) {
        this.autoGrow(ta);
        ta.focus();
        const len = ta.value.length;
        ta.setSelectionRange(len, len);
      }
    }, 0);
  }

  autoGrow(el: HTMLTextAreaElement | null) {
    if (el) this.textService.autoGrow(el);
  }

  renderMessage(text: string): SafeHtml {
    return this.textService.renderMessage(text);
  }

  handleChannelDeleted() {
    this.channelDeleted.emit();
    this.closeDialogChannelDescription();
  }

  scrollToMessage(messageId: string) {
    const chatSection = this.chatSections
      .find(section => section.nativeElement.dataset['messageId'] === messageId)
      ?.nativeElement;

    if (chatSection) {
      chatSection.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest'
      });
    }
  }
}