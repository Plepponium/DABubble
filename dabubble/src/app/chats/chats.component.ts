import { Component, Output, EventEmitter, Input, inject, OnChanges, SimpleChanges, OnInit, ViewChild, ElementRef, HostListener, ViewChildren, QueryList, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, registerLocaleData } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { ChannelService } from '../../services/channel.service';
import { UserService } from '../../services/user.service';
import { User } from '../../models/user.class';
import { Chat } from '../../models/chat.class';
import { BehaviorSubject, firstValueFrom, Observable, of, Subject, take, takeUntil } from 'rxjs';
import { reactionIcons } from '../reaction-icons';
import localeDe from '@angular/common/locales/de';
import { ChatsReactionService } from '../../services/chats-reaction.service';
import { LogoutService } from '../../services/logout.service';
import { ChatsDataService } from '../../services/chats-data.service';
import { ChatsTextService } from '../../services/chats-text.service';
import { ChatsUiService } from '../../services/chats-ui.service';
import { ChannelHeaderComponent } from "../channel-header/channel-header.component";
import { ChatInputComponent } from "../chat-input/chat-input.component";
import { ChatMessageComponent } from "../chat-message/chat-message.component";
registerLocaleData(localeDe);

@Component({
  selector: 'app-chats',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, MatFormFieldModule, MatInputModule, MatIconModule, MatButtonModule, ChannelHeaderComponent, ChatInputComponent, ChatMessageComponent],
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
  
  activeReactionDialogueIndex: number | null = null;
  activeReactionDialogueBelowIndex: number | null = null;
  overlayActive = false;
  insertedAtPending = false;
  isResponsive = false;
  pendingScroll = false;
  activeSmiley = false;
  private isSubmitting = false;

  currentUserId: string = '';
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
    this.uiService.setResponsive(window.innerWidth < 881);
  }

  /** Updates the responsive layout flag based on the current window width. */
  private updateIsResponsive() {
    this.isResponsive = window.innerWidth < 881;
  }

  /** Focuses the message input field if the event target is not an input icon bar. */
  focusInput(event: MouseEvent) {
    if (event.target === this.messageInput?.nativeElement ||
      event.target instanceof HTMLElement &&
      event.target.closest('.input-icon-bar')) {
      return;
    }

    this.messageInput?.nativeElement?.focus();
  }

  /** Returns a unique identifier for each chat message. */
  trackByChatId(chat: any): string {
    return chat.id;
  }

  /** Initializes subscriptions and loads initial channel and user data. */
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
      this.isResponsive = isResponsive; 
    });
  }

  /** Reacts to input changes such as channelId and reloads channel data accordingly. */
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
        this.participants = this.dataService.participants;
        this.filteredChannels = this.dataService.filteredChannels;
      }
    }
  }

  /** Cleans up resources when the component is destroyed. */
  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Returns the date of a chat message based on its timestamp. */
  getChatDate(chat: any): Date | undefined {
    return chat.time ? new Date(chat.time * 1000) : undefined;
  }

  /** Opens the reactions dialogue for a specific chat message. */
  openReactionsDialogue(event: { index: number; below: boolean }) {
    const index = event.index;
    const below = event.below;
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

  /** Adds a reaction if the user hasn't reacted yet. */
  async addReaction(event: { index: number; type: string }) {
    const index = event.index;
    const type = event.type;   
    
    const chats = await firstValueFrom(this.chats$.pipe(take(1)));
    const chat = chats[index];
    if (!chat) return;

    this.activeReactionDialogueIndex = null;
    this.activeReactionDialogueBelowIndex = null;

    const currentReactionUsers = chat.reactions?.[type] || [];
    if (!currentReactionUsers.includes(this.currentUserId)) {
      const updatedUsers = [...currentReactionUsers, this.currentUserId];
      await this.channelService.setReaction(this.channelId!, chat.id, type, updatedUsers);
      this.reactionService.updateLocalReaction(
        chat, type, updatedUsers, index,
        this.chatsSubject, this.participants, this.currentUserId
      );
    }
  }

  /** Toggles the current user's reaction on a message. */
  async toggleReaction(event: { index: number; type: string }) {
    const index = event.index;  
    const type = event.type;   

    const chat = await this.getChatByIndex(index);
    if (!chat) return;

    const currentUsers = this.reactionService.extractUserIds(chat.reactions || {}, type); 
    let updatedUsers: string[];
    if (currentUsers.includes(this.currentUserId)) {
      updatedUsers = currentUsers.filter(uid => uid !== this.currentUserId);
    } else {
      updatedUsers = [...currentUsers, this.currentUserId];
    }

    await this.channelService.setReaction(this.channelId!, chat.id, type, updatedUsers);
    this.reactionService.updateLocalReaction(
      chat, type, updatedUsers, index,
      this.chatsSubject, this.participants, this.currentUserId
    ); 
  }

  /** Returns a chat message by its index in the current channel's chat list. */
  private async getChatByIndex(chatIndex: number): Promise<any> {
    if (this.channelChats && this.channelChats.length > chatIndex) {
      return this.channelChats[chatIndex];
    }
    const chats = await firstValueFrom(this.chats$.pipe(
      takeUntil(this.destroy$)
    ));
    return chats?.[chatIndex];
  }

  /** Emits event to open a thread for a message. */
  openAddComment(chat: Chat) {
    if (!this.channelId) return;

    this.openThread.emit({
      channelId: this.channelId,
      chatId: chat.id
    });
  }

  /** Closes the channel description dialog. */
  closeDialogChannelDescription() {
    this.showChannelDescription = false;
  }

  /** Opens the profile dialog for the selected user. */
  openDialogueShowProfile(user: User) {
    this.profileOpen = true;
    this.openProfile.emit(user);
  }

  /** Sends the current message to the active channel. */
  submitChatMessage() {
    if (this.isSubmitting || !this.canSendMessage()) return;
    
    this.isSubmitting = true; 
    const messagePayload = this.buildMessagePayload();

    this.channelService.addChatToChannel(this.channelId!, messagePayload)
      .then(() => {
        this.newMessage = '';
        [0, 50, 150].forEach(delay => 
          setTimeout(() => this.uiService.scrollToBottomNewMessage(), delay)
        );
      })
      .catch(err => {
        console.error('Fehler beim Senden:', err);
      })
      .finally(() => {
        this.isSubmitting = false;
      });
  }

  /** Determines whether the current message can be sent based on state and input. */
  private canSendMessage(): boolean {
    if (!this.newMessage?.trim()) return false;
    if (!this.channelId || !this.currentUserId) return false;
    return true;
  }

  /** Builds the payload object for a new chat message. */
  private buildMessagePayload() {
    return {
      message: this.newMessage.trim(),
      time: Math.floor(Date.now() / 1000),
      user: this.currentUserId
    };
  }

  /** Opens the thread view for a specific chat message. */
  handleOpenThread(chatId: string) {
    if (!this.channelId) return;
    this.openThread.emit({ channelId: this.channelId, chatId });
  }

  /** Opens the profile dialog for a specific chat message's user. */
  handleOpenProfile(chat: Chat) {
    const user = this.participants.find(u => u.uid === chat.user);
    if (user) {
      this.openProfile.emit(user);
    }
  }

  /** Updates local state when a thread answer is added. */
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

  /** Enables edit mode for the selected chat message and prepares its edit state. */
  enableEditChat(chat: any) {
    this.chatsSubject.getValue().forEach(c => c.isEditing = false);
    chat.isEditing = true;
    chat.editedText = chat.message;
    this.focusAndAutoGrow(chat.id);
  }

  /** Cancels edit mode and restores the original message content. */
  cancelEditChat(chat: any) {
    chat.isEditing = false;
    chat.editedText = chat.message;
  }

  /** Saves edited message if content changed. Closes edit mode otherwise. */
  async saveEditedChat(chat: any) {
    const newText = chat.editedText.trim();
    if (!newText || newText === chat.message) {
      chat.isEditing = false;
      return;
    }

    this.updateChatMessage({ messageId: chat.id, newText });
    chat.isEditing = false;
  }

  /** Updates a message via ChannelService. */
  async updateChatMessage(event: { messageId: string; newText: string }) {
    if (!this.channelId || !event.messageId || !event.newText.trim()) return;

    try {
      await this.channelService.updateChatMessage(this.channelId, event.messageId, event.newText.trim());
    } catch (err) {
      console.error('Fehler beim Aktualisieren der Nachricht:', err);
    }
  }

  /** Focuses the edit textarea and adjusts its height to fit the content. */
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

  /** Automatically adjusts the textarea height to fit its content. */
  autoGrow(el: HTMLTextAreaElement | null) {
    if (el) this.textService.autoGrow(el);
  }

  /** Handles channel deletion by emitting an event and closing related dialogs. */
  handleChannelDeleted() {
    this.channelDeleted.emit();
    this.closeDialogChannelDescription();
  }

  /** Scrolls to a specific message in the list. */
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