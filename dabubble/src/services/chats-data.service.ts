import { Injectable } from "@angular/core"
import { BehaviorSubject, combineLatest, forkJoin, map, Observable, of, Subject, switchMap, take, takeUntil } from "rxjs"
import { Chat } from "../models/chat.class"
import { User } from "../models/user.class"
import { ChannelService } from "./channel.service"
import { UserService } from "./user.service"
import { ChatsReactionService } from "./chats-reaction.service"

@Injectable({ providedIn: 'root' })
export class ChatsDataService {
  destroy$!: Observable<void>;
  currentUserId: string = '';
  channels: any[] = [];
  filteredChannels: any[] = []
  participants: User[] = [];
  
  channelId: string = '';
  channelName$ = of(''); 
  participants$ = of<User[]>([]); 
  chatsSubject = new BehaviorSubject<Chat[]>([]);
  pendingScroll = false;

  private currentUserIdSubject = new BehaviorSubject<string>('');
  public currentUserId$ = this.currentUserIdSubject.asObservable();
  
  /** Injects required services for channel, user, and reaction handling. */
  constructor(
    private channelService: ChannelService,
    private userService: UserService,
    private reactionService: ChatsReactionService
  ) {}

  /** Fetches the current user and initializes user-dependent state and filters. */
  getCurrentUser() {
    this.userService.getCurrentUser().pipe(
    take(1),
    takeUntil(this.destroy$)
    ).subscribe(user => {
    if (user) {
        this.currentUserId = user.uid;
        this.filterChannelsForCurrentUser();

        this.currentUserIdSubject.next(user.uid); 
        this.currentUserId = user.uid;
    }
    });
  }

  /** Filters available channels to those including the current user. */
  private filterChannelsForCurrentUser() {
    this.channelService.getChannels().pipe(
      takeUntil(this.destroy$)
    ).subscribe(channels => {
      this.channels = channels;
      this.filteredChannels = channels.filter(c => c.participants.includes(this.currentUserId));
    });
  }

  /** Loads all channels once and stores them locally. */
  loadChannels() {
    this.channelService.getChannels().pipe(
      take(1),
      takeUntil(this.destroy$)
    ).subscribe(channels => {
      this.channels = channels;
    });
  }

  /** Loads a channel by ID and initializes all related observables. */
  loadChannelWithId(channelId: string) {
    this.channelId = channelId;
    const channel$ = this.channelService.getChannelById(channelId);
    this.setupChannelObservables(channel$);
  }

  /** Sets up channel name, participants, and chat subscriptions for a channel. */
  private setupChannelObservables(channel$: Observable<any>) {
    this.channelName$ = channel$.pipe(map(channel => channel?.name ?? ''));
    this.participants$ = channel$.pipe(
      switchMap(channel => this.userService.getUsersByIds(channel?.participants ?? []))
    );
    this.participants$.pipe(takeUntil(this.destroy$)).subscribe(users => this.participants = users);
    this.subscribeToChatsAndUsers(this.channelId!, this.participants$);
  }

  /** Subscribes to chats and participants and keeps enriched chat state in sync. */
  private subscribeToChatsAndUsers(channelId: string, participants$: Observable<User[]>) {
    if (!participants$) {
      console.warn('participants$ is undefined, skipping chats subscription');
      return;
    }
    combineLatest([
      this.channelService.getChatsForChannel(channelId),
      participants$
    ])
      .pipe(
        switchMap(([chats, users]) => this.processChatsAndUsers(chats, users, channelId)),
        map(chats => this.sortChatsByTime(chats)),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: chats => this.handleLoadedChats(chats)
      });
  }

  /** Enriches all chats with user, reactions, and answer metadata. */
  private processChatsAndUsers(chats: Chat[], users: User[], channelId: string): Observable<Chat[]> {
    if (!chats.length || !users.length) return of([]);
    const enrichedChats$ = chats.map(chat => this.enrichSingleChat(chat, users, channelId));
    return forkJoin(enrichedChats$);
  }

  /** Enriches a single chat with user data, reactions, and answers. */
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

  /** Normalizes reaction data into a consistent string-array map. */
  private normalizeChatReactions(reactions: any): Record<string, string[]> {
    const normalized: Record<string, string[]> = {};
    Object.entries(reactions).forEach(([key, val]) => {
      normalized[key] = Array.isArray(val) ? val : typeof val === 'string' ? [val] : [];
    });
    return normalized;
  }

  /** Finds and returns the user associated with a chat message. */
  private findChatUser(chatUserId: string, users: User[]): User | undefined {
    return users.find(u => u.uid === chatUserId);
  }

  /** Builds a fully enriched chat object with user, reactions, and metadata. */
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
      reactionArray: this.reactionService.transformReactionsToArray(reactions, this.participants, this.currentUserId)
    };
  }

  /** Sorts chats in ascending order by timestamp. */
  private sortChatsByTime(chats: Chat[]): Chat[] {
    return chats.sort((a, b) => a.time - b.time);
  }

  /** Updates chat state and triggers pending scroll behavior if needed. */
  private handleLoadedChats(chats: Chat[]) {
    this.chatsSubject.next(chats);
    if (this.pendingScroll) {
      setTimeout(() => {
        this.scrollToBottom();
        this.pendingScroll = false;
      }, 0);
    }
  }

  /** Scrolls the chat history container to the bottom. */
  scrollToBottom() {
    const chatHistory = document.getElementById('chat-history');
    if (chatHistory) {
        chatHistory.scrollTop = chatHistory.scrollHeight;
    }
  }
}