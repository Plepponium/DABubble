import { Component, Output, EventEmitter, inject, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RoundBtnComponent } from '../round-btn/round-btn.component';
import { Observable, of, take, takeUntil } from 'rxjs';
import { ChannelService } from '../../services/channel.service';
import { UserService } from '../../services/user.service';
import { DirectMessageService } from '../../services/direct-messages.service';
import { User } from '../../models/user.class';
import { MentionsOverlayComponent } from '../shared/mentions-overlay/mentions-overlay.component';
import { SmileyOverlayComponent } from "../shared/smiley-overlay/smiley-overlay.component";
import { reactionIcons } from '../reaction-icons';
import { LogoutService } from '../../services/logout.service';
import { NewMessageService } from '../../services/new-message.service';

@Component({
  selector: 'app-new-message',
  imports: [CommonModule, FormsModule, RoundBtnComponent, MentionsOverlayComponent, SmileyOverlayComponent],
  templateUrl: './new-message.component.html',
  styleUrl: './new-message.component.scss'
})
export class NewMessageComponent {
  @ViewChild('newMessageInput') newMessageInput!: ElementRef<HTMLTextAreaElement>;
  @Output() openChannel = new EventEmitter<string>();
  @Output() openUserChat = new EventEmitter<User>();
  @Output() inputMissing = new EventEmitter<{ recipientMissing: boolean; textMissing: boolean; }>();

  currentUserId: string = '';
  participants: User[] = [];
  filteredChannels: any[] = [];

  newMessage: string = '';
  recipientText: string = '';

  mentionCaretIndex: number | null = null;
  recipientCaretIndex: number | null = null;
  cursorPosRecipient: number = 0;
  cursorPosMessage: number = 0;

  overlayActiveMessage = false;
  overlayActiveRecipient = false;

  channelName$: Observable<string> = of('');
  participants$: Observable<User[]> = of([]);

  channelService = inject(ChannelService);
  userService = inject(UserService);
  dmService = inject(DirectMessageService);
  logoutService = inject(LogoutService);
  private destroy$ = this.logoutService.logout$;
  private newMessageService = inject(NewMessageService);

  activeSmiley = false;
  allSmileys = reactionIcons;

  /** Initializes component data when the component is created. */
  ngOnInit() {
    this.loadInitialData();
  }

  /** Loads current user, channels and participants. */
  private loadInitialData() {
    this.loadCurrentUser();
    this.loadAllUsers();
  }

  /** Loads the current user and triggers loading of user channels. */
  private loadCurrentUser() {
    this.userService.getCurrentUser()
      .pipe(take(1), takeUntil(this.destroy$))
      .subscribe(user => {
        if (!user) return;
        this.currentUserId = user.uid;
        this.loadUserChannels();
      });
  }

  /** Loads all channels the current user participates in. */
  private loadUserChannels() {
    this.channelService.getChannels()
      .pipe(take(1), takeUntil(this.destroy$))
      .subscribe(channels => {
        this.filteredChannels = channels.filter(c =>
          Array.isArray(c.participants) && c.participants.includes(this.currentUserId)
        );
      });
  }

  /** Loads all users and exposes them as participants. */
  loadAllUsers() {
    this.userService.getUsers().pipe(
      take(1),
      takeUntil(this.destroy$)
    ).subscribe(users => {
      this.participants$ = of(users);
      this.participants = users;
    });
  }

  /** Focuses the message input when clicking outside the icon bar. */
  focusInput(event: MouseEvent) {
    if (this.clickedInsideInputBar(event)) return;
    this.newMessageInput?.nativeElement?.focus();
  }

  /** Returns true if the click happened inside the input or icon bar. */
  private clickedInsideInputBar(event: MouseEvent): boolean {
    const target = event.target;
    if (target === this.newMessageInput?.nativeElement) return true;
    if (target instanceof HTMLElement && target.closest('.input-icon-bar')) return true;
    return false;
  }

  /** Toggles the smiley overlay visibility. */
  openSmileyOverlay() {
    this.activeSmiley = !this.activeSmiley;
  }

  /** Inserts a selected smiley into the message and restores caret. */
  onSmileySelected(smiley: string, el: HTMLTextAreaElement) {
    const { text, caret } = this.newMessageService.insertSmiley(this.newMessage, smiley, el.selectionStart ?? 0, el.selectionEnd ?? 0);
    this.newMessage = text;
    this.setCaretAndFocus(el, caret);
    this.activeSmiley = false;
  }

  /** Inserts a character at the current cursor position in the message. */
  insertAtCursor(character: string, el: HTMLTextAreaElement) {
    const { text, caret } = this.newMessageService.insertAtCursor(this.newMessage, character, el.selectionStart ?? 0, el.selectionEnd ?? 0);
    this.newMessage = text;
    this.mentionCaretIndex = caret;
    this.setCaretAndFocus(el, caret);
  }

  /** Updates the caret index used for message mentions. */
  updateCaretPosition(el: HTMLTextAreaElement | HTMLInputElement) {
    if (!el) return;
    this.mentionCaretIndex = el.selectionStart || 0;
  }

  /** Updates the caret index used for recipient mentions. */
  updateRecipientCaret(el: HTMLTextAreaElement | HTMLInputElement) {
    if (!el) return;
    this.recipientCaretIndex = el.selectionStart || 0;
  }

  /** Sets caret position and focuses the given input element. */
  private setCaretAndFocus(el: HTMLTextAreaElement | HTMLInputElement, caret: number) {
    setTimeout(() => {
      el.selectionStart = el.selectionEnd = caret;
      el.focus();
    });
  }

  /** Inserts a mention into the message textarea at the caret position. */
  insertMention(event: { name: string; type: 'user' | 'channel' | 'email' }, el: HTMLTextAreaElement) {
    const { text, caret } = this.newMessageService.insertMentionInMessage(this.newMessage, event, this.mentionCaretIndex);
    this.newMessage = text;
    this.mentionCaretIndex = caret;
    this.setCaretAndFocus(el, caret);
    this.overlayActiveMessage = false;
  }

  /** Inserts a mention into the recipient input at the caret position. */
  insertMentionInRecipientInput(event: { name: string; type: 'user' | 'channel' | 'email' }, el: HTMLInputElement) {
    const { text, caret } = this.newMessageService.insertMentionInRecipient(this.recipientText, event, this.recipientCaretIndex);
    this.recipientText = text;
    this.recipientCaretIndex = caret;
    this.setCaretAndFocus(el, caret);
    this.overlayActiveRecipient = false;
  }

  /** Validates input, sends the message and navigates to the recipient. */
  async submitMessage() {
    const isValid = this.validateInputs();
    if (!isValid) return;
    const parsed = this.newMessageService.parseRecipients(this.recipientText);
    const payload = this.newMessageService.buildMessagePayload(
      this.newMessage,
      this.currentUserId
    );
    await Promise.all([
      this.newMessageService.sendToChannels(parsed.channelMentions, payload, this.filteredChannels, this.channelService),
      this.newMessageService.sendToUsers(parsed.userMentions, payload, this.participants, this.currentUserId, this.dmService),
      this.newMessageService.sendToEmails(parsed.emailMentions, payload, this.participants, this.currentUserId, this.dmService)
    ]);
    this.goToMessage();
    setTimeout(() => this.resetInputs());
  }

  /** Checks whether message and recipient inputs are filled. */
  private validateInputs(): boolean {
    const trimmedMessage = this.newMessage.trim();
    const trimmedRecipients = this.recipientText.trim();
    const recipientMissing = !trimmedRecipients;
    const textMissing = !trimmedMessage;
    if (recipientMissing || textMissing) {
      this.inputMissing.emit({ recipientMissing, textMissing });
      return false;
    }
    return true;
  }

  /** Clears message and recipient input fields. */
  private resetInputs() {
    this.recipientText = '';
    this.newMessage = '';
  }

  /** Navigates to the first recipient after sending a message. */
  goToMessage() {
    const firstRecipient = this.newMessageService.getFirstRecipient(this.recipientText);
    if (!firstRecipient) return;
    if (this.newMessageService.isUserMention(firstRecipient)) {
      this.openUserByName(this.newMessageService.extractMentionName(firstRecipient));
      return;
    }
    if (this.newMessageService.isChannelMention(firstRecipient)) {
      this.openChannelByName(this.newMessageService.extractMentionName(firstRecipient));
      return;
    }
    if (this.newMessageService.isEmailMention(firstRecipient)) {
      this.openUserByEmail(firstRecipient);
      return;
    }
    console.warn(`⚠️ Empfänger nicht erkannt: ${firstRecipient}`);
  }

  /** Opens a direct chat by resolving the user name. */
  private openUserByName(name: string) {
    const user = this.newMessageService.findUserByName(name, this.participants);
    if (!user) {
      console.warn(`⚠️ User "${name}" nicht gefunden.`);
      return;
    }
    this.openUserChat.emit(user);
  }

  /** Opens a channel by resolving the channel name. */
  private openChannelByName(name: string) {
    const channel = this.newMessageService.findChannelByName(name, this.filteredChannels);
    if (!channel) {
      console.warn(`⚠️ Channel "${name}" nicht gefunden.`);
      return;
    }
    this.openChannel.emit(channel.id);
  }

  /** Opens a direct chat by resolving the user email. */
  private openUserByEmail(email: string) {
    const user = this.newMessageService.findUserByEmail(email, this.participants);
    if (!user) {
      console.warn(`⚠️ Kein Benutzer mit E-Mail "${email}" gefunden.`);
      return;
    }
    this.openUserChat.emit(user);
  }

  /** Handles Enter key presses to submit the message. */
  onEnterPress(e: KeyboardEvent) {
    if (this.overlayActiveMessage) {
      e.preventDefault();
      return;
    }
    e.preventDefault();
    this.submitMessage();
  }
}