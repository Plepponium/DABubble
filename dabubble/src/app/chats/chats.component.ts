import { Component, Output, EventEmitter, Input, inject, OnChanges, SimpleChanges, OnInit, ViewChild, ElementRef, AfterViewInit, HostListener, ViewChildren, QueryList } from '@angular/core';
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
import { BehaviorSubject, combineLatest, forkJoin, map, Observable, of, switchMap, take } from 'rxjs';
import { reactionIcons } from '../reaction-icons';
import localeDe from '@angular/common/locales/de';
import { MentionsOverlayComponent } from '../shared/mentions-overlay/mentions-overlay.component';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { SmileyOverlayComponent } from "../shared/smiley-overlay/smiley-overlay.component";
registerLocaleData(localeDe);

@Component({
  selector: 'app-chats',
  imports: [CommonModule, FormsModule, MatFormFieldModule, MentionsOverlayComponent, MatInputModule, MatIconModule, MatButtonModule, RoundBtnComponent, DialogueOverlayComponent, ChatAddUserOverlayComponent, ChannelDescriptionOverlayComponent, SmileyOverlayComponent],
  templateUrl: './chats.component.html',
  styleUrl: './chats.component.scss',
})
export class ChatsComponent implements OnInit, OnChanges {
  @ViewChildren('chatSection') chatSections!: QueryList<ElementRef<HTMLElement>>;

  value = 'Clear me';
  showChannelDescription = false;
  showUserDialogue = false;
  showAddDialogue = false;
  showAddDialogueResponsive = false;
  usersDisplayActive = false;
  editCommentDialogueExpanded = false;
  activeReactionDialogueIndex: number | null = null;
  activeReactionDialogueBelowIndex: number | null = null;
  overlayActive = false;
  insertedAtPending = false;
  isResponsive = false;
  pendingScroll  = false;

  currentUserId: string = '';
  channels: any[] = [];
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

  channelService = inject(ChannelService);
  userService = inject(UserService);

  activeSmiley = false;
  allSmileys = reactionIcons;

  @Input() channelId?: string;
  @Input() profileOpen = false;
  @Output() openThread = new EventEmitter<{ channelId: string; chatId: string }>();
  @Output() openProfile = new EventEmitter<User>();
  @Output() channelDeleted = new EventEmitter<void>();
  @ViewChild('messageInput') messageInput!: ElementRef<HTMLTextAreaElement>;

  constructor(private sanitizer: DomSanitizer) { }
  
  @HostListener('window:resize')
  onResize() {
    this.updateIsResponsive();
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

  scrollToBottom() {
    const chatHistory = document.getElementById('chat-history');
    if (chatHistory) {
      chatHistory.scrollTop = chatHistory.scrollHeight;
    }
  }

  ngOnInit() {
    this.updateIsResponsive();
    this.getCurrentUser();
    this.loadChannels();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['channelId']) {
      const newChannelId = changes['channelId'].currentValue;
      if (newChannelId) {
        this.pendingScroll  = true;
        this.loadChannelWithId(newChannelId);
      }
    }
  }

  private getCurrentUser() {
    this.userService.getCurrentUser().pipe(take(1)).subscribe(user => {
      if (user) {
        this.currentUserId = user.uid;
        this.filterChannelsForCurrentUser();
      }
    });
  }

  private filterChannelsForCurrentUser() {
    this.channelService.getChannels().subscribe(channels => {
      this.channels = channels;
      this.filteredChannels = channels.filter(c => c.participants.includes(this.currentUserId));
    });
  }

  private loadChannels() {
    this.channelService.getChannels().pipe(take(1)).subscribe(channels => {
      this.channels = channels;
    });
  }

  private loadChannelWithId(channelId: string) {
    this.channelId = channelId;
    const channel$ = this.channelService.getChannelById(channelId);
    this.setupChannelObservables(channel$);
  }

  private setupChannelObservables(channel$: Observable<any>) {
    this.channelName$ = channel$.pipe(map(channel => channel?.name ?? ''));
    this.participants$ = channel$.pipe(
      switchMap(channel => this.userService.getUsersByIds(channel?.participants ?? []))
    );
    this.participants$.subscribe(users => this.participants = users);
    this.subscribeToChatsAndUsers(this.channelId!, this.participants$);
  }

  subscribeToParticipants() {
    this.participants$.subscribe(users => {this.participants = users;});
  }

  // private subscribeToChatsAndUsers(channelId: string, participants$: Observable<User[]>) {
  //   combineLatest([
  //     this.channelService.getChatsForChannel(channelId),
  //     participants$
  //   ]).pipe(
  //     switchMap(([chats, users]) => {
  //       if (!chats.length || !users.length) return of([]);
  //       const enrichedChats$ = chats.map(chat => this.enrichChat(channelId, chat, users));
  //       return forkJoin(enrichedChats$);
  //     }),
  //     map(chats => chats.sort((a, b) => a.time - b.time))
  //   ).subscribe(enrichedChats => {
  //     this.chatsSubject.next(enrichedChats);
  //     setTimeout(() => this.scrollToBottom());
  //   });
  // }
  private subscribeToChatsAndUsers(channelId: string, participants$: Observable<User[]>) {
    combineLatest([
      this.channelService.getChatsForChannel(channelId),
      participants$
    ])
    .pipe(
      switchMap(([chats, users]) => this.processChatsAndUsers(chats, users, channelId)),
      map(chats => this.sortChatsByTime(chats))
    )
    .subscribe({
      next: chats => this.handleLoadedChats(chats)
    });
  }

  private processChatsAndUsers(chats: Chat[], users: User[], channelId: string): Observable<Chat[]> {
    if (!chats.length || !users.length) return of([]);
    const enrichedChats$ = chats.map(chat => this.enrichSingleChat(chat, users, channelId));
    return forkJoin(enrichedChats$);
  }

  private enrichSingleChat(chat: Chat, users: User[], channelId: string): Observable<Chat> {
    const reactions = this.normalizeChatReactions(chat.reactions || {});
    return forkJoin({
      reactions: of(reactions),
      user: of(this.findChatUser(chat.user, users)),
      answers: this.channelService.getAnswersForChat(channelId, chat.id).pipe(take(1))
    }).pipe(
      map(({ reactions, user, answers }) => this.buildEnrichedChat(chat, user, reactions, answers))
    );
  }

  private normalizeChatReactions(reactions: any): Record<string, string[]> {
    const normalized: Record<string, string[]> = {};
    Object.entries(reactions).forEach(([key, val]) => {
      normalized[key] = Array.isArray(val) ? val : typeof val === 'string' ? [val] : [];
    });
    return normalized;
  }

  private findChatUser(chatUserId: string, users: User[]): User | undefined {
    return users.find(u => u.uid === chatUserId);
  }

  private buildEnrichedChat(
    chat: Chat, 
    user: User | undefined, 
    reactions: Record<string, string[]>, 
    answers: any[]
  ): Chat {
    const isMissingUser = !user;
    return {
      ...chat,
      userName: isMissingUser ? 'Ehemaliger Nutzer' : user!.name,
      userImg: isMissingUser ? 'default-user' : user!.img,
      isUserMissing: isMissingUser,
      answersCount: answers.length,
      lastAnswerTime: answers.length > 0 ? answers[answers.length - 1].time : null,
      reactions,
      reactionArray: this.transformReactionsToArray(reactions, this.participants, this.currentUserId)
    };
  }

  private sortChatsByTime(chats: Chat[]): Chat[] {
    return chats.sort((a, b) => a.time - b.time);
  }

  private handleLoadedChats(chats: Chat[]) {
    this.chatsSubject.next(chats);
    // this.scrollToBottom();
    // setTimeout(() => this.scrollToBottom());
    // if (this.shouldScrollToBottom) {
    //   setTimeout(() => this.scrollToBottom(), 0);
    // }
    if (this.pendingScroll ) {
    setTimeout(() => {
      this.scrollToBottom();
      this.pendingScroll  = false;  // ← Nach Scroll deaktivieren
    }, 0);
  }
  }

  // private enrichChat(channelId: string, chat: Chat, users: User[]): Observable<Chat> {
  //   const normalizedReactions: Record<string, string[]> = {};
  //   Object.entries(chat.reactions || {}).forEach(([key, val]) => {
  //     if (Array.isArray(val)) {
  //       normalizedReactions[key] = val;
  //     } else if (typeof val === 'string') {
  //       normalizedReactions[key] = [val];
  //     } else {
  //       normalizedReactions[key] = [];
  //     }
  //   });

  //   return forkJoin({
  //     reactions: of(normalizedReactions), 
  //     user: of(users.find(u => u.uid === chat.user)),
  //     answers: this.channelService.getAnswersForChat(channelId, chat.id).pipe(take(1))
  //   }).pipe(
  //     map(({ reactions, user, answers }) => {
  //       const isMissingUser = !user;
  //       const enriched: Chat = {
  //         ...chat,
  //         userName: isMissingUser ? 'Ehemaliger Nutzer' : user.name,
  //         userImg: isMissingUser ? 'default-user' : user.img,
  //         isUserMissing: isMissingUser,
  //         answersCount: answers.length,
  //         lastAnswerTime: answers.length > 0 ? answers[answers.length - 1].time : null,
  //         reactions: reactions,
  //         reactionArray: this.transformReactionsToArray(reactions, users, this.currentUserId)
  //       };
  //       return enriched;
  //     })
  //   );
  // }

  getChatDate(chat: any): Date | undefined {
    return chat.time ? new Date(chat.time * 1000) : undefined;
  }

  isSameDate(d1: Date | undefined, d2: Date | undefined): boolean {
    if (!d1 || !d2) return false;
    return d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate();
  }

  // getDisplayDate(date: Date | undefined): string {
  //   if (!date) return '';

  //   const today = new Date();
  //   const yesterday = new Date();
  //   yesterday.setDate(today.getDate() - 1);

  //   if (this.isSameDate(date, today)) {
  //     return 'Heute';
  //   } else if (this.isSameDate(date, yesterday)) {
  //     return 'Gestern';
  //   } else {
  //     return new Intl.DateTimeFormat('de-DE', {
  //       weekday: 'long',
  //       day: 'numeric',
  //       month: 'long'
  //     }).format(date);
  //   }
  // }
  getDisplayDate(date: Date | undefined): string {
    if (!date) return '';
    const referenceDates = this.getReferenceDates();
    
    if (this.isToday(date, referenceDates.today)) return 'Heute';
    if (this.isYesterday(date, referenceDates.yesterday)) return 'Gestern';
    
    return this.formatFullDate(date);
  }

  private getReferenceDates() {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    return { today, yesterday };
  }

  private isToday(date: Date, today: Date): boolean {
    return this.isSameDate(date, today);
  }

  private isYesterday(date: Date, yesterday: Date): boolean {
    return this.isSameDate(date, yesterday);
  }

  private formatFullDate(date: Date): string {
    return new Intl.DateTimeFormat('de-DE', {
      weekday: 'long',
      day: 'numeric', 
      month: 'long'
    }).format(date);
  }

  openReactionsDialogue(chatIndex: number) {
    if (this.activeReactionDialogueIndex === chatIndex) {
      this.activeReactionDialogueIndex = null; 
    } else {
      this.editCommentDialogueExpanded = false;
      this.activeReactionDialogueIndex = chatIndex;
      this.activeReactionDialogueBelowIndex = null;
    }
  }

  openReactionsDialogueBelow(chatIndex: number) {
    if (this.activeReactionDialogueBelowIndex === chatIndex) {
      this.activeReactionDialogueBelowIndex = null;
    } else {
      this.editCommentDialogueExpanded = false;
      this.activeReactionDialogueBelowIndex = chatIndex; 
      this.activeReactionDialogueIndex = null;
    }
  }

  transformReactionsToArray(
    reactionsMap: Record<string, string[]>,
    participants: User[],
    currentUserId: string
  ): {
    type: string,
    count: number,
    userIds: string[],
    currentUserReacted: boolean,
    otherUserName?: string,
    otherUserReacted: boolean
  }[] {
    if (!reactionsMap) return [];

    return Object.entries(reactionsMap).map(([type, usersRaw]) => {
      const userIds = this.parseUserIds(Array.isArray(usersRaw) ? usersRaw : [usersRaw]);
      const currentUserReacted = userIds.includes(currentUserId);
      const otherUserName = this.findOtherUserName(userIds, currentUserId, participants);
      const otherUserReacted = userIds.filter(id => id !== currentUserId).length > 1;

      return {
        type,
        count: userIds.length,
        userIds,
        currentUserReacted,
        otherUserName,
        otherUserReacted
      };
    })
      .sort((a, b) => a.type.localeCompare(b.type));
  }

  private parseUserIds(users: string[]): string[] {
    return users.flatMap(u => u.includes(',') ? u.split(',').map(id => id.trim()) : [u]);
  }

  private findOtherUserName(userIds: string[], currentUserId: string, participants: User[]): string | undefined {
    const others = userIds.filter(id => id !== currentUserId);
    if (others.length === 0) return undefined;
    return participants.find(u => u.uid === others[0])?.name || 'Unbekannt';
  }

  private updateLocalReaction(chat: any, reactionType: string, updatedUsers: string[], chatIndex: number) {
    chat.reactions = { ...chat.reactions };
    if (updatedUsers.length === 0) {
      delete chat.reactions[reactionType];
    } else {
      chat.reactions[reactionType] = updatedUsers;
    }
    chat.reactionArray = this.transformReactionsToArray(chat.reactions, this.participants, this.currentUserId);

    const chats = this.chatsSubject.getValue();
    const newChats = [...chats];
    newChats[chatIndex] = chat; 
    this.chatsSubject.next(newChats);
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
      this.updateLocalReaction(chat, reactionType, updatedUsers, chatIndex);
    }
  }

  async toggleReaction(chatIndex: number, reactionType: string) {
    const chat = await this.getChatByIndex(chatIndex);
    if (!chat) return;

    const currentUsers = this.extractUserIds(chat.reactions || {}, reactionType);
    let updatedUsers: string[];
    if (currentUsers.includes(this.currentUserId)) {
      updatedUsers = currentUsers.filter(uid => uid !== this.currentUserId);
    } else {
      updatedUsers = [...currentUsers, this.currentUserId];
    }

    await this.channelService.setReaction(this.channelId!, chat.id, reactionType, updatedUsers);
    this.updateLocalReaction(chat, reactionType, updatedUsers, chatIndex);
  }

  private extractUserIds(reactions: Record<string, any>, reactionType: string): string[] {
    let usersRaw = reactions[reactionType];
    if (!usersRaw) return [];

    if (!Array.isArray(usersRaw)) {
      usersRaw = [usersRaw];
    }

    return usersRaw.flatMap((u: string) =>
      u.includes(',') ? u.split(',').map((x: string) => x.trim()) : [u]
    );
  }

  // Hilfsmethode, um den Chat aus Observable oder Cache zu erhalten
  private async getChatByIndex(chatIndex: number): Promise<any> {
    if (this.channelChats && this.channelChats.length > chatIndex) {
      return this.channelChats[chatIndex];
    }
    // Alternativ Chats aus Observable abrufen, dann Wert zurückgeben
    return new Promise(resolve => {
      this.chats$.pipe(take(1)).subscribe((chats: any) => resolve(chats[chatIndex]));
    })
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

  openDialogChannelDescription() {
    this.showChannelDescription = true;
  };

  closeDialogChannelDescription() {
    this.showChannelDescription = false;
  }

  openDialogueShowUser() {
    this.showUserDialogue = true;
    this.usersDisplayActive = true;
  }

  closeDialogueShowUser() {
    this.showUserDialogue = false;
    if (this.showAddDialogue = false) {
      this.usersDisplayActive = false;
    }
  }

  chooseOpenDialogue() {
    if (window.innerWidth <= 1010) {
      this.openDialogueShowUser();
    } else {
      this.openDialogueAddUser();
    }
  }

  openDialogueAddUser() {
    this.showAddDialogue = true;
    this.showAddDialogueResponsive = false;
    this.showUserDialogue = false;
  }

  openDialogueAddUserResponsive() {
    this.showAddDialogue = true;
    this.showAddDialogueResponsive = true;
  }

  closeDialogueAddUser() {
    this.showAddDialogue = false;
    this.showAddDialogueResponsive = false;
    this.usersDisplayActive = false;
  }

  openDialogueShowProfile(user: User) {
    this.profileOpen = true;
    this.openProfile.emit(user);
  }

  onEnterPress(e: KeyboardEvent) {
    if (this.overlayActive) {
      e.preventDefault();
      return;
    }
    this.submitChatMessage();
    e.preventDefault();
  }

  submitChatMessage() {
    if (!this.newMessage.trim()) return;
    if (!this.channelId || !this.currentUserId) return;

    const messagePayload = {
      message: this.newMessage.trim(),
      time: Math.floor(Date.now() / 1000),
      user: this.currentUserId
    };
    this.channelService.addChatToChannel(this.channelId, messagePayload)
      .then(() => {
        this.newMessage = '';
        setTimeout(() => this.scrollToBottom());
      })
      .catch(err => {
        console.error('Fehler beim Senden:', err);
      });
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
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    const before = this.newMessage.slice(0, start);
    const after = this.newMessage.slice(end);
    this.newMessage = before + `:${smiley}:` + after;
    const caret = start + smiley.length + 2;
    setTimeout(() => {
      el.selectionStart = el.selectionEnd = caret;
      el.focus();
    });
    this.activeSmiley = false;
  }

  insertMention(
    event: { name: string; type: 'user' | 'channel' | 'email' },
    el: HTMLTextAreaElement
  ) {
    const trigger = event.type === 'user' ? '@' : '#';
    const pos = this.mentionCaretIndex ?? this.newMessage.length;
    const before = this.newMessage.slice(0, pos);
    const after = this.newMessage.slice(pos);
    const replaced = before.replace(/([@#])([^\s]*)$/, `${trigger}${event.name}`);
    this.newMessage = replaced + ' ' + after;
    this.mentionCaretIndex = replaced.length + 1;
    setTimeout(() => {
      el.selectionStart = el.selectionEnd = this.mentionCaretIndex!;
      this.updateCaretPosition(el);
      el.focus();
    });
    this.overlayActive = false;
  }

  updateCaretPosition(el: HTMLTextAreaElement | HTMLInputElement) {
    if (!el) return;
    this.mentionCaretIndex = el.selectionStart || 0;
  }

  updateEditCaret(chat: any, textarea: HTMLTextAreaElement) {
    chat._caretIndex = textarea.selectionStart;
  }

  insertMentionInEdit(
    chat: any,
    event: { name: string; type: 'user' | 'channel' | 'email' }
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

  insertAtCursor(character: string = '@', el: HTMLTextAreaElement) {
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const before = this.newMessage.slice(0, start);
    const after = this.newMessage.slice(end);
    this.newMessage = before + character + after;
    this.mentionCaretIndex = start + character.length;
    setTimeout(() => {
      el.selectionStart = el.selectionEnd = this.mentionCaretIndex!;
      el.focus();
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
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }

  renderMessage(text: string): SafeHtml {
    if (!text) return '';

    const replaced = text.replace(/:([a-zA-Z0-9_+-]+):/g, (match, name) => {
      return `<img src="assets/reaction-icons/${name}.svg"
                  alt="${name}"
                  class="inline-smiley">`;
    });

    return this.sanitizer.bypassSecurityTrustHtml(replaced);
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