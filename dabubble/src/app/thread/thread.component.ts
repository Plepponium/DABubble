import { Component, Output, EventEmitter, Input, inject, OnInit, SimpleChanges, ViewChild, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { RoundBtnComponent } from '../round-btn/round-btn.component';
import { BehaviorSubject, Observable, of, take, takeUntil } from 'rxjs';
import { ChannelService } from '../../services/channel.service';
import { UserService } from '../../services/user.service';
import { User } from '../../models/user.class';
import { Chat } from '../../models/chat.class';
import { ChatWithDetails } from '../../models/chat-with-details.class';
import { Answer } from '../../models/answer.class';
import { reactionIcons } from '../reaction-icons';
import { MentionsOverlayComponent } from '../shared/mentions-overlay/mentions-overlay.component';
import { SmileyOverlayComponent } from "../shared/smiley-overlay/smiley-overlay.component";
import { SafeHtml } from '@angular/platform-browser';
import { LogoutService } from '../../services/logout.service';
import { ChatsUiService } from '../../services/chats-ui.service';
import { ThreadService } from '../../services/thread.service';
import { ThreadHelpService } from '../../services/thread-help.service';

@Component({
  selector: 'app-thread',
  imports: [CommonModule, FormsModule, MatFormFieldModule, MatInputModule, MatIconModule, MatButtonModule, RoundBtnComponent, MentionsOverlayComponent, SmileyOverlayComponent],
  templateUrl: './thread.component.html',
  styleUrl: './thread.component.scss'
})
export class ThreadComponent implements OnInit {
  @ViewChild('answerInput', { static: false }) answerInput!: ElementRef<HTMLTextAreaElement>;
  channelService = inject(ChannelService);
  userService = inject(UserService);
  logoutService = inject(LogoutService);
  uiService = inject(ChatsUiService);
  threadService = inject(ThreadService);
  threadHelpService = inject(ThreadHelpService);

  overlayActive: boolean = false;
  editAnswerEditIndex: number | null = null;
  activeReactionDialogueIndex: string | null = null;
  activeReactionDialogueBelowIndex: string | null = null;
  activeReactionDialogueAnswersIndex: number | null = null;
  activeReactionDialogueBelowAnswersIndex: number | null = null;
  insertedAtPending = false;
  isResponsive = false;
  private isSubmitting = false;

  currentUserId: string = '';
  participantIds: string[] = [];
  participants: User[] = [];
  filteredChannels: any[] = [];
  reactionIcons = reactionIcons;
  reactionArray: { type: string, count: number, user: string[] }[] = [];
  newAnswer: string = '';
  mentionCaretIndex: number | null = null;
  cursorPos: number = 0;
  showAllReactionsForChat: { [chatId: string]: boolean } = {};
  showAllReactionsForAnswer: { [answerId: string]: boolean } = {};

  channelName$: Observable<string> = of('');
  participants$: Observable<User[]> = of([]);
  chat$!: Observable<Chat | undefined>;
  answers$!: Observable<Answer[]>;

  private chatsSubject = new BehaviorSubject<ChatWithDetails[]>([]);
  public chats$ = this.chatsSubject.asObservable();
  private destroy$ = this.logoutService.logout$;

  activeSmiley = false;
  allSmileys = reactionIcons;

  @Input() channelId!: string;
  @Input() chatId!: string;
  @Output() closeThread = new EventEmitter<void>();
  @Output() openProfile = new EventEmitter<User>();
  @Output() answerAdded = new EventEmitter<{ chatId: string, answerTime: number }>();

  /** Initializes the component, sets responsive state, and loads initial channel and user data. */
  ngOnInit() {
    this.updateIsResponsive();
    this.getCurrentUserAndChannels();
    this.loadChannelWithId();
  }

  /** Handles input changes and reloads chat and answers when channelId or chatId changes. */
  ngOnChanges(changes: SimpleChanges) {
    if (changes['chatId'] && !changes['chatId'].firstChange) {
      this.chat$ = this.threadService.getEnrichedChat(this.channelId, this.chatId, this.participants$, this.currentUserId);
      this.answers$ = this.threadService.getEnrichedAnswers(this.channelId, this.chatId, this.participants$, this.currentUserId);
      
      this.answers$.pipe(take(1), takeUntil(this.destroy$)).subscribe(() => {
        this.threadService.scrollToBottom();
      });
    }
    if (changes['channelId'] && !changes['channelId'].firstChange) {
      this.getCurrentUserAndChannels();
      this.loadChannelWithId();
    }
  }

  @HostListener('window:resize') 
  /** Updates responsive state when the window is resized. */
  onResize() {
    this.updateIsResponsive();
  }

  /** Sets the responsive flag based on the current window width. */
  updateIsResponsive() { 
    this.isResponsive = window.innerWidth < 881;
  }

  
/** Focuses the answer input unless clicking directly on input or icon bar elements. */
  focusInput(event: MouseEvent) {
    if (event.target === this.answerInput?.nativeElement ||
      event.target instanceof HTMLElement &&
      event.target.closest('.input-icon-bar')) {
      return;
    }

    this.answerInput?.nativeElement?.focus();
  }

  /** Retrieves the current user ID and available channels from the service. */
  getCurrentUserAndChannels() {
    this.threadService.getCurrentUserAndChannels().subscribe(result => {
      this.currentUserId = result.userId;
      this.filteredChannels = result.channels;
    });
  }

  /** Loads channel details, participants, chat, and answers for the current channelId. */
  private loadChannelWithId() {
    this.threadService.loadChannelWithId(this.channelId).subscribe(({ channelName$, participants$ }) => {
      this.channelName$ = channelName$;
      this.participants$ = participants$;

      this.subscribeToParticipants();

      this.chat$ = this.threadService.getEnrichedChat(this.channelId, this.chatId, this.participants$, this.currentUserId);
      this.answers$ = this.threadService.getEnrichedAnswers(this.channelId, this.chatId, this.participants$, this.currentUserId);
      
      this.answers$.pipe(take(1), takeUntil(this.destroy$)).subscribe(() => {
        this.threadService.scrollToBottom();
      });
    });
  }

  /** Subscribes to participant updates and stores them locally. */
  subscribeToParticipants() {
    this.participants$.pipe(takeUntil(this.destroy$)).subscribe(users => {
      this.participants = users;
    });
  }

  /** Toggles the reactions dialog visibility for a specific chat message. */
  openReactionsDialogue(chatId: string) {
    if (this.activeReactionDialogueIndex === chatId) {
      this.activeReactionDialogueIndex = null;
    } else {
      this.editAnswerEditIndex = null;
      this.activeReactionDialogueIndex = chatId;
      this.activeReactionDialogueBelowIndex = null;
    }
  }

  /** Toggles the reactions dialog visibility for a specific answer. */
  openReactionsDialogueAnswers(i: number) {
    if (this.activeReactionDialogueAnswersIndex === i) {
      this.activeReactionDialogueAnswersIndex = null;
    } else {
      this.editAnswerEditIndex = null;
      this.activeReactionDialogueAnswersIndex = i;
      this.activeReactionDialogueBelowAnswersIndex = null;
    }
  }

  /** Toggles the lower reactions dialog visibility for a specific chat message. */
  openReactionsDialogueBelow(chatId: string) {
    if (this.activeReactionDialogueBelowIndex === chatId) {
      this.activeReactionDialogueBelowIndex = null;
    } else {
      this.editAnswerEditIndex = null;
      this.activeReactionDialogueBelowIndex = chatId;
      this.activeReactionDialogueIndex = null;
    }
  }

  /** Toggles the lower reactions dialog visibility for a specific answer. */
  openReactionsDialogueBelowAnswers(i: number) {
    if (this.activeReactionDialogueBelowAnswersIndex === i) {
      this.activeReactionDialogueBelowAnswersIndex = null;
    } else {
      this.editAnswerEditIndex = null;
      this.activeReactionDialogueBelowAnswersIndex = i;
      this.activeReactionDialogueAnswersIndex = null;
    }
  }

  /** Adds a reaction to the current chat and updates the observable if successful. */
  async addReaction(chatId: string, reactionType: string) {
    const updatedChat = await this.threadService.addReaction(
      this.channelId, this.chat$, reactionType, this.currentUserId, this.participants
    );

    if (updatedChat) {
      this.chat$ = of(updatedChat); 
    }
  }

  /** Adds a reaction to a specific answer and refreshes the answers list. */
  async addReactionToAnswer(answerId: string, reactionType: string) {
    const updatedAnswers = await this.threadService.addReactionToAnswer(
      this.channelId, this.chatId, this.answers$, answerId, reactionType, this.currentUserId, this.participants
    );

    if (updatedAnswers) {
      this.subscribeAnswers();
    }
  }

  /** Toggles the current user's reaction on a chat message. */
  async toggleReactionForChat(chatId: string, reactionType: string) {
    const updatedChat = await this.threadService.toggleReactionForChat(
      this.channelId, this.chat$, reactionType, this.currentUserId, this.participants
    );

    if (updatedChat) this.chat$ = of(updatedChat);
  }

  /** Toggles the current user's reaction on an answer. */
  async toggleReactionForAnswer(answerId: string, reactionType: string) {
    const updatedAnswers = await this.threadService.toggleReactionForAnswer(
      this.channelId, this.chatId, this.answers$, answerId, reactionType, this.currentUserId, this.participants
    );

    if (updatedAnswers) {
      this.subscribeAnswers();
    }
  }

  /** Emits an event to close the thread view. */
  handleCloseThread() {
    this.closeThread.emit();
  }
 
  /** Submits a new answer to the thread and scrolls to the latest message. */
  async submitAnswer() {
    if (this.isSubmitting || !this.newAnswer.trim()) return;
    this.isSubmitting = true;

    try {
      const result = await this.threadService.submitAnswer(this.channelId, this.chatId, this.newAnswer, this.currentUserId);

      if (result.success) {
        this.answerAdded.emit({ chatId: this.chatId, answerTime: result.answerTime! });
        this.newAnswer = '';

        [0, 50, 150].forEach(delay =>
          setTimeout(() => this.threadService.scrollToBottomNewMessage(), delay)
        );
      }
    } finally {
      this.isSubmitting = false;
    }
  }

  /** Handles Enter key press to submit answer unless overlay is active. */
  onEnterPress(e: KeyboardEvent) {
    if (this.overlayActive) {
      e.preventDefault();
      return;
    }

    this.submitAnswer();
    e.preventDefault();
  }

  /** Loads user details and emits profile open event when username is clicked. */
  onUserNameClick(userId: string) {
    if (!userId) return;
    this.userService.getSingleUserById(userId).pipe(take(1), takeUntil(this.destroy$)).subscribe(user => {
      if (user) {
        this.openProfile.emit(user);
      }
    });
  }

  /** Toggles the smiley overlay visibility. */
  openSmileyOverlay() {
    this.activeSmiley = !this.activeSmiley;
  }

  /** Inserts selected smiley into the answer input and closes the overlay. */
  onSmileySelected(smiley: string) {
    this.threadHelpService.insertSmiley(
      this.answerInput.nativeElement,
      this.newAnswer,
      smiley
    );
    this.newAnswer = this.answerInput.nativeElement.value; // Sync
    this.activeSmiley = false;
  }

  /** Inserts a mention into the answer input and restores caret position. */
  insertMention(event: { name: string; type: 'user' | 'channel' | 'email' }) {
    const result = this.threadHelpService.insertMention(this.newAnswer, event, this.mentionCaretIndex);
    this.newAnswer = result.newText;
    this.mentionCaretIndex = result.newCaretIndex;
    
    setTimeout(() => {
      const textarea = this.answerInput.nativeElement;
      textarea.selectionStart = textarea.selectionEnd = this.mentionCaretIndex!;
      textarea.focus();
    });
    this.overlayActive = false;
  }

  /** Updates the caret position for mention insertion tracking. */
  updateCaretPosition() {
    const textarea = this.answerInput?.nativeElement;
    if (!textarea) return;
    this.mentionCaretIndex = textarea.selectionStart ?? 0;
  }

  /** Updates the caret index while editing an answer. */
  updateEditCaret(answer: any, textarea: HTMLTextAreaElement) {
    answer._caretIndex = textarea.selectionStart;
  }

  /** Toggles the edit menu visibility for an answer. */
  toggleEditMenu(answer: Answer) {
    answer.showEditMenu = !answer.showEditMenu;
  }

  /** Enables editing mode for an answer and initializes edited text. */
  enableEditAnswer(answer: Answer) {
    answer.showEditMenu = false;
    answer.isEditing = true;
    answer.editedText = answer.message;
  }

  /** Cancels editing mode and restores original answer text. */
  cancelEditAnswer(answer: Answer) {
    answer.isEditing = false;
    answer.editedText = answer.message;
  }

  /** Inserts a mention into the edited answer and restores caret position. */
  insertMentionInEdit(answer: any, event: { name: string; type: 'user' | 'channel' | 'email' }) {
    const result = this.threadHelpService.insertMentionInEdit(answer.editedText, answer._caretIndex, event);
    answer.editedText = result.newText;
    answer._caretIndex = result.newCaretIndex;
    
    setTimeout(() => {
      const textarea = document.getElementById(`edit-${answer.id}`) as HTMLTextAreaElement;
      if (textarea) {
        textarea.selectionStart = textarea.selectionEnd = answer._caretIndex;
        textarea.focus();
      }
    });
  }

  /** Inserts a character at the current cursor position in the answer input. */
  insertAtCursor(character: string = '@') {
    const textarea = this.answerInput.nativeElement;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = this.newAnswer.slice(0, start);
    const after = this.newAnswer.slice(end);
    this.newAnswer = before + character + after;
    this.mentionCaretIndex = start + character.length;
    setTimeout(() => {
      textarea.selectionStart = textarea.selectionEnd = this.mentionCaretIndex!;
      textarea.focus();
    }); 0
  }

  /** Saves the edited answer and refreshes the answers list if successful. */
  async saveEditedAnswer(answer: Answer) {
    const result = await this.threadService.saveEditedAnswer(this.channelId, this.chatId, answer, answer.editedText ?? '');

    if (result) {
      this.subscribeAnswers();
    }
  }

  /** Reloads enriched answers and scrolls to the bottom. */
  subscribeAnswers() {
    this.answers$ = this.threadService.getEnrichedAnswers(
      this.channelId, this.chatId, this.participants$, this.currentUserId
    );

    this.answers$.pipe(take(1), takeUntil(this.destroy$)).subscribe(() => {
      this.threadService.scrollToBottom();
    });
  }

  /** Renders formatted message text safely for display. */
  renderMessage(text: string): SafeHtml {
    return this.threadHelpService.renderMessage(text);
  }
}