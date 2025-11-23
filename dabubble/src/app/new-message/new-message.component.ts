import { Component, Output, EventEmitter, Input, inject, ViewChild, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RoundBtnComponent } from '../round-btn/round-btn.component';
import { Observable, of, take } from 'rxjs';
import { ChannelService } from '../../services/channel.service';
import { UserService } from '../../services/user.service';
import { DirectMessageService } from '../../services/direct-messages.service';
import { User } from '../../models/user.class';
import { MentionsOverlayComponent } from '../shared/mentions-overlay/mentions-overlay.component';
import { Channel } from '../../models/channel.class';
import { SmileyOverlayComponent } from "../shared/smiley-overlay/smiley-overlay.component";
import { reactionIcons } from '../reaction-icons';

@Component({
  selector: 'app-new-message',
  imports: [CommonModule, FormsModule, RoundBtnComponent, MentionsOverlayComponent, SmileyOverlayComponent],
  templateUrl: './new-message.component.html',
  styleUrl: './new-message.component.scss'
})
export class NewMessageComponent {
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

  activeSmiley = false;
  allSmileys = reactionIcons;

  @Output() openChannel = new EventEmitter<string>();
  @Output() openUserChat = new EventEmitter<User>();

  ngOnInit() {
    this.getCurrentUserAndChannels();
    this.loadAllUsers();
  }

  getCurrentUserAndChannels() {
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

  loadAllUsers() {
    this.userService.getUsers().pipe(take(1)).subscribe(users => {
      this.participants$ = of(users);
      this.participants = users;
      // console.log('🔹 Alle User geladen:', users.length);
      // console.log('participants', this.participants);
    });
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

  insertMention(event: { name: string; type: 'user' | 'channel' | 'email' },
    el: HTMLTextAreaElement) {
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
    this.overlayActiveMessage = false;
  }

  insertMentionInRecipientInput(
    event: { name: string; type: 'user' | 'channel' | 'email' },
    el: HTMLInputElement
  ) {
    const pos = this.recipientCaretIndex ?? this.recipientText.length;
    const before = this.recipientText.slice(0, pos);
    const after = this.recipientText.slice(pos);

    // build insert value
    let insertValue = '';
    if (event.type === 'user') insertValue = `@${event.name}`;
    else if (event.type === 'channel') insertValue = `#${event.name}`;
    else insertValue = event.name; // email

    // replace last token only (works for @trigger, #trigger and plain text/email)
    // if there's an @ or # right before caret, regex will replace the partial trigger token
    const newBefore = before.replace(/([@#]?[^\s]*)$/, insertValue);

    this.recipientText = newBefore + ' ' + after;
    // caret -> after inserted text + space
    this.recipientCaretIndex = newBefore.length + 1;

    setTimeout(() => {
      el.selectionStart = el.selectionEnd = this.recipientCaretIndex!;
      el.focus();
    });

    // overlay flag for recipient should be turned off
    this.overlayActiveRecipient = false;
  }





  updateCaretPosition(el: HTMLTextAreaElement | HTMLInputElement) {
    if (!el) return;
    this.mentionCaretIndex = el.selectionStart || 0;
  }

  updateRecipientCaret(el: HTMLTextAreaElement | HTMLInputElement) {
    if (!el) return;
    this.recipientCaretIndex = el.selectionStart || 0;
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

  async submitMessage() {
    if (!this.validateInputs()) return;

    const { userMentions, channelMentions } = this.parseRecipients(this.recipientText);
    const messagePayload = this.buildMessagePayload(this.newMessage);

    await Promise.all([
      this.sendToChannels(channelMentions, messagePayload),
      this.sendToUsers(userMentions, messagePayload)
    ]);

    this.goToMessage();
    setTimeout(() => {
      this.resetInputs();
    });
  }

  private validateInputs(): boolean {
    const trimmedMessage = this.newMessage.trim();
    const trimmedRecipients = this.recipientText.trim();

    if (!trimmedMessage || !trimmedRecipients) {
      console.warn('⚠️ Nachricht oder Empfänger fehlt.');
      return false;
    }
    return true;
  }

  private parseRecipients(text: string): { userMentions: string[], channelMentions: string[] } {
    const userMentions = text.match(/@\s*[\p{L}\p{M}\s]+/gu)?.map(t => t.replace(/^@\s*/, '').trim()) || [];
    const channelMentions = text.match(/#\s*[\w-]+/g)?.map(t => t.replace(/^#\s*/, '').trim()) || [];
    return { userMentions, channelMentions };
  }

  private buildMessagePayload(message: string) {
    return {
      message: message.trim(),
      time: Math.floor(Date.now() / 1000),
      user: this.currentUserId
    };
  }

  private async sendToChannels(channelMentions: string[], payload: any) {
    if (channelMentions.length === 0) return;

    const sendPromises = channelMentions.map(async name => {
      const channel = this.filteredChannels.find(c => c.name === name);
      if (!channel) {
        console.warn(`⚠️ Channel "${name}" nicht gefunden.`);
        return;
      }

      await this.channelService.addChatToChannel(channel.id, payload);
      // console.log(`📨 Nachricht an #${name} gesendet.`);
    });

    await Promise.all(sendPromises);
  }

  private async sendToUsers(userMentions: string[], payload: any) {
    if (userMentions.length === 0) return;

    const sendPromises = userMentions.map(async fullName => {
      const targetUser = this.participants.find(u => u.name.trim().toLowerCase() === fullName.toLowerCase());
      if (!targetUser) {
        console.warn(`⚠️ Benutzer "${fullName}" nicht gefunden.`);
        return;
      }

      try {
        const dmId = await this.dmService.getOrCreateDmId(this.currentUserId, targetUser.uid);
        await this.dmService.sendMessage(dmId, {
          senderId: this.currentUserId,
          text: payload.message
        });

        // console.log(`💬 Nachricht an @${fullName} über DM gesendet.`);
      } catch (err) {
        console.error(`❌ Fehler beim Senden an @${fullName}:`, err);
      }
    });

    await Promise.all(sendPromises);
  }

  private resetInputs() {
    this.recipientText = '';
    this.newMessage = '';
    // console.log('✅ Nachricht erfolgreich gesendet.');
  }

  goToMessage() {
    const recipient = this.getFirstRecipient();
    if (!recipient) return;

    const name = this.extractMentionName(recipient);

    if (this.isUserMention(recipient)) {
      this.openUserByName(name);
      return;
    }

    if (this.isChannelMention(recipient)) {
      this.openChannelByName(name);
      return;
    }

    console.warn(`⚠️ Empfänger nicht erkannt: ${recipient}`);
  }

  private getFirstRecipient(): string | null {
    // Full user mention: @Firstname Lastname (Mehrwort!)
    const userMatch = this.recipientText.match(/^@\s*[\p{L}\p{M}\s]+/u);
    if (userMatch) return userMatch[0].trim();

    // Channel: #channel
    const channelMatch = this.recipientText.match(/^#\s*[\w-]+/);
    if (channelMatch) return channelMatch[0].trim();

    return null;
  }

  private extractMentionName(mention: string): string {
    return mention.substring(1).trim();
  }

  private isUserMention(text: string): boolean {
    return text.startsWith('@');
  }

  private openUserByName(name: string) {
    const user = this.findUserByName(name);
    if (!user) {
      console.warn(`⚠️ User "${name}" nicht gefunden.`);
      return;
    }

    this.handleOpenUserChat(user);
  }

  private findUserByName(fullName: string): User | undefined {
    return this.participants.find(
      u => u.name.trim().toLowerCase() === fullName.toLowerCase()
    );
  }

  handleOpenUserChat(user: User) {
    this.openUserChat.emit(user);
  }

  private isChannelMention(text: string): boolean {
    return text.startsWith('#');
  }

  private openChannelByName(name: string) {
    const channel = this.findChannelByName(name);

    if (!channel) {
      console.warn(`⚠️ Channel "${name}" nicht gefunden.`);
      return;
    }

    this.handleOpenChannel(channel);
  }

  private findChannelByName(name: string): Channel | undefined {
    return this.filteredChannels.find(
      c => c.name.trim().toLowerCase() === name.toLowerCase()
    );
  }

  handleOpenChannel(channel: Channel) {
    this.openChannel.emit(channel.id);
  }

  onEnterPress(e: KeyboardEvent) {
    if (this.overlayActiveMessage) {
      e.preventDefault();
      return;
    }
    this.submitMessage();
    e.preventDefault();
  }

  // autoGrow(el: HTMLTextAreaElement | null) {
  //   if (!el) return;
  //   el.style.height = 'auto';
  //   el.style.height = `${el.scrollHeight}px`;
  // }
}