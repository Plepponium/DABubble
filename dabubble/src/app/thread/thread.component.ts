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
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { LogoutService } from '../../services/logout.service';
import { ChatInputComponent } from "../chat-input/chat-input.component";
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
  sanitizer = inject(DomSanitizer);

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

  // constructor(private sanitizer: DomSanitizer) { }

  ngOnInit() {
    this.updateIsResponsive();
    this.getCurrentUserAndChannels();
    this.loadChannelWithId(this.channelId);
  }

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
      this.loadChannelWithId(this.channelId);
    }
  }

  @HostListener('window:resize') 
  onResize() {
    this.updateIsResponsive();
  }

  updateIsResponsive() { 
    this.isResponsive = window.innerWidth < 881;
  }

  focusInput(event: MouseEvent) {
    if (event.target === this.answerInput?.nativeElement ||
      event.target instanceof HTMLElement &&
      event.target.closest('.input-icon-bar')) {
      return;
    }

    this.answerInput?.nativeElement?.focus();
  }

  getCurrentUserAndChannels() {
    this.threadService.getCurrentUserAndChannels().subscribe(result => {
      this.currentUserId = result.userId;
      this.filteredChannels = result.channels;
    });
  }

  private loadChannelWithId(channelId: string) {
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


  subscribeToParticipants() {
    this.participants$.pipe(takeUntil(this.destroy$)).subscribe(users => {
      this.participants = users;
    });
  }


  openReactionsDialogue(chatId: string) {
    if (this.activeReactionDialogueIndex === chatId) {
      this.activeReactionDialogueIndex = null;
    } else {
      this.editAnswerEditIndex = null;
      this.activeReactionDialogueIndex = chatId;
      this.activeReactionDialogueBelowIndex = null;
    }
  }

  openReactionsDialogueAnswers(i: number) {
    if (this.activeReactionDialogueAnswersIndex === i) {
      this.activeReactionDialogueAnswersIndex = null;
    } else {
      this.editAnswerEditIndex = null;
      this.activeReactionDialogueAnswersIndex = i;
      this.activeReactionDialogueBelowAnswersIndex = null;
    }
  }

  openReactionsDialogueBelow(chatId: string) {
    if (this.activeReactionDialogueBelowIndex === chatId) {
      this.activeReactionDialogueBelowIndex = null;
    } else {
      this.editAnswerEditIndex = null;
      this.activeReactionDialogueBelowIndex = chatId;
      this.activeReactionDialogueIndex = null;
    }
  }

  openReactionsDialogueBelowAnswers(i: number) {
    if (this.activeReactionDialogueBelowAnswersIndex === i) {
      this.activeReactionDialogueBelowAnswersIndex = null;
    } else {
      this.editAnswerEditIndex = null;
      this.activeReactionDialogueBelowAnswersIndex = i;
      this.activeReactionDialogueAnswersIndex = null;
    }
  }


  async addReaction(chatId: string, reactionType: string) {
    const updatedChat = await this.threadService.addReaction(
      this.channelId,
      this.chat$,
      reactionType,
      this.currentUserId,
      this.participants
    );

    if (updatedChat) {
      this.chat$ = of(updatedChat); 
    }
  }

  async addReactionToAnswer(answerId: string, reactionType: string) {
    const updatedAnswers = await this.threadService.addReactionToAnswer(
      this.channelId,
      this.chatId,
      this.answers$,
      answerId,
      reactionType,
      this.currentUserId,
      this.participants
    );

    if (updatedAnswers) {
      this.subscribeAnswers();
    }
  }

  async toggleReactionForChat(chatId: string, reactionType: string) {
    const updatedChat = await this.threadService.toggleReactionForChat(
      this.channelId,
      this.chat$,
      reactionType,
      this.currentUserId,
      this.participants
    );

    if (updatedChat) this.chat$ = of(updatedChat);
  }

  async toggleReactionForAnswer(answerId: string, reactionType: string) {
    const updatedAnswers = await this.threadService.toggleReactionForAnswer(
      this.channelId,
      this.chatId,
      this.answers$,
      answerId,
      reactionType,
      this.currentUserId,
      this.participants
    );

    if (updatedAnswers) {
      this.subscribeAnswers();
    }
  }


  handleCloseThread() {
    this.closeThread.emit();
  }
 

  async submitAnswer() {
    if (this.isSubmitting || !this.newAnswer.trim()) return;
    this.isSubmitting = true;

    try {
      const result = await this.threadService.submitAnswer(
        this.channelId,
        this.chatId,
        this.newAnswer,
        this.currentUserId
      );

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


  onEnterPress(e: KeyboardEvent) {
    if (this.overlayActive) {
      e.preventDefault();
      return;
    }

    this.submitAnswer();
    e.preventDefault();
  }

  onUserNameClick(userId: string) {
    if (!userId) return;
    this.userService.getSingleUserById(userId).pipe(take(1), takeUntil(this.destroy$)).subscribe(user => {
      if (user) {
        this.openProfile.emit(user);
      }
    });
  }

  openSmileyOverlay() {
    this.activeSmiley = !this.activeSmiley;
  }

  
  onSmileySelected(smiley: string) {
    this.threadHelpService.insertSmiley(
      this.answerInput.nativeElement,
      this.newAnswer,
      smiley
    );
    this.newAnswer = this.answerInput.nativeElement.value; // Sync
    this.activeSmiley = false;
  }

  
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

  updateCaretPosition() {
    const textarea = this.answerInput?.nativeElement;
    if (!textarea) return;
    this.mentionCaretIndex = textarea.selectionStart ?? 0;
  }

  updateEditCaret(answer: any, textarea: HTMLTextAreaElement) {
    answer._caretIndex = textarea.selectionStart;
  }

  toggleEditMenu(answer: Answer) {
    answer.showEditMenu = !answer.showEditMenu;
  }

  enableEditAnswer(answer: Answer) {
    answer.showEditMenu = false;
    answer.isEditing = true;
    answer.editedText = answer.message;
  }

  cancelEditAnswer(answer: Answer) {
    answer.isEditing = false;
    answer.editedText = answer.message;
  }

  insertMentionInEdit(answer: any, event: { name: string; type: 'user' | 'channel' | 'email' }) {
    const result = this.threadHelpService.insertMentionInEdit(
      answer.editedText,
      answer._caretIndex,
      event
    );
    
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

  async saveEditedAnswer(answer: Answer) {
    const result = await this.threadService.saveEditedAnswer(
      this.channelId,
      this.chatId,
      answer,
      answer.editedText ?? ''
    );

    if (result) {
      this.subscribeAnswers();
    }
  }

  subscribeAnswers() {
    this.answers$ = this.threadService.getEnrichedAnswers(
      this.channelId,
      this.chatId,
      this.participants$,
      this.currentUserId
    );

    this.answers$.pipe(take(1), takeUntil(this.destroy$)).subscribe(() => {
      this.threadService.scrollToBottom();
    });
  }

  renderMessage(text: string): SafeHtml {
    return this.threadHelpService.renderMessage(text);
  }
}