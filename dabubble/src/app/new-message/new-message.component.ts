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
  @Output() inputMissing = new EventEmitter<{
    recipientMissing: boolean;
    textMissing: boolean;
  }>();
  @ViewChild('newMessageInput') newMessageInput!: ElementRef<HTMLTextAreaElement>;

  focusInput(event: MouseEvent) {
    if (event.target === this.newMessageInput?.nativeElement ||
        event.target instanceof HTMLElement && 
        event.target.closest('.input-icon-bar')) {
      return;
    }
    
    this.newMessageInput?.nativeElement?.focus();
  }

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

    // const replaced = before.replace(/([@#])([^\s]*)$/, `${trigger}${event.name}`);
    const triggerRegex = /(@[A-Za-zÀ-ÖØ-öø-ÿ0-9_-]*|#[A-Za-z0-9_-]*|[A-Za-z0-9._%+-]+)$/;
    const replaced = before.replace(triggerRegex, `${trigger}${event.name}`);

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
    // const newBefore = before.replace(/([@#]?[^\s]*)$/, insertValue);

    // this.recipientText = newBefore + ' ' + after;
    // // caret -> after inserted text + space
    // this.recipientCaretIndex = newBefore.length + 1;

    // 🔥 Nur Trigger ersetzen
    // const triggerRegex = /(@[A-Za-zÀ-ÖØ-öø-ÿ0-9_-]*|#[A-Za-z0-9_-]*|[A-Za-z0-9._%+-]*)$/;
    const triggerRegex = /(?:@[A-Za-zÀ-ÖØ-öø-ÿ0-9_-]*|#[A-Za-z0-9_-]*|[A-Za-z0-9._%+-]+)$/;
    const replacedBefore = before.replace(triggerRegex, insertValue);

    this.recipientText = replacedBefore + ' ' + after;

    this.recipientCaretIndex = replacedBefore.length + 1;

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

    // const { userMentions, channelMentions } = this.parseRecipients(this.recipientText);
    const { userMentions, channelMentions, emailMentions } =
      this.parseRecipients(this.recipientText);
    const messagePayload = this.buildMessagePayload(this.newMessage);

    await Promise.all([
      this.sendToChannels(channelMentions, messagePayload),
      this.sendToUsers(userMentions, messagePayload),
      this.sendToEmails(emailMentions, messagePayload)
    ]);

    this.goToMessage();
    setTimeout(() => {
      this.resetInputs();
    });
  }

  private validateInputs(): boolean {
    const trimmedMessage = this.newMessage.trim();
    const trimmedRecipients = this.recipientText.trim();

    const recipientMissing = !trimmedRecipients;
    const textMissing = !trimmedMessage;

    if (recipientMissing || textMissing) {
      // if (!trimmedMessage || !trimmedRecipients) {
      // console.warn('⚠️ Nachricht oder Empfänger fehlt.');
      this.inputMissing.emit({ recipientMissing, textMissing });
      return false;
    }
    return true;
  }

  // private parseRecipients(text: string): { userMentions: string[], channelMentions: string[] } {
  //   const userMentions = text.match(/@\s*[\p{L}\p{M}\s]+/gu)?.map(t => t.replace(/^@\s*/, '').trim()) || [];
  //   const channelMentions = text.match(/#\s*[\w-]+/g)?.map(t => t.replace(/^#\s*/, '').trim()) || [];
  //   return { userMentions, channelMentions };
  // }
  // private parseRecipients(text: string): { userMentions: string[], channelMentions: string[], emailMentions: string[] } {
  //   const userMentions =
  //     text.match(/@\s*[\p{L}\p{M}\s]+/gu)?.map(t => t.replace(/^@\s*/, '').trim()) || [];

  //   const channelMentions =
  //     text.match(/#\s*[\w-]+/g)?.map(t => t.replace(/^#\s*/, '').trim()) || [];

  //   const emailMentions =
  //     text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[A-Za-z]{2,}/g) || [];

  //   return { userMentions, channelMentions, emailMentions };
  // }
  private parseRecipients(text: string): {
    userMentions: string[];
    channelMentions: string[];
    emailMentions: string[];
  } {

    const userRegex = /(?:^|\s)@([A-Za-zÀ-ÖØ-öø-ÿ]+(?:-[A-Za-zÀ-ÖØ-öø-ÿ]+)*(?:\s+[A-Za-zÀ-ÖØ-öø-ÿ]+(?:-[A-Za-zÀ-ÖØ-öø-ÿ]+)*)*)(?=\s+@|\s+(?!@)[A-Za-z0-9._%+-]+@|[\s,]|$)/g;
    const users: string[] = [];
    let m1;
    while ((m1 = userRegex.exec(text)) !== null) {
      users.push(m1[1].trim());
    }

    const channelRegex = /#([A-Za-z0-9_-]+)/g;
    const channels: string[] = [];
    let m2;
    while ((m2 = channelRegex.exec(text)) !== null) {
      channels.push(m2[1]);
    }

    const emailRegex = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
    const emails = text.match(emailRegex) || [];

    return {
      userMentions: users,
      channelMentions: channels,
      emailMentions: emails
    };
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
  // private matchUsersByName(userMentions: string[]): any[] {
  //   return userMentions
  //     .map(name => this.participants.find(
  //       u => u.name.trim().toLowerCase() === name.toLowerCase()
  //     ))
  //     .filter(u => {
  //       if (!u) console.warn(`⚠️ Benutzer nicht gefunden (Name):`);
  //       return !!u;
  //     });
  // }
  // private matchUsersByEmail(emailMentions: string[]): any[] {
  //   return emailMentions
  //     .map(email => this.participants.find(
  //       u => u.email?.trim().toLowerCase() === email.toLowerCase()
  //     ))
  //     .filter(u => {
  //       if (!u) console.warn(`⚠️ Benutzer nicht gefunden (Email):`);
  //       return !!u;
  //     });
  // }
  // private async sendToUsers(users: any[], payload: any) {
  //   if (!users || users.length === 0) return;

  //   const promises = users.map(async user => {
  //     try {
  //       const dmId = await this.dmService.getOrCreateDmId(this.currentUserId, user.uid);
  //       await this.dmService.sendMessage(dmId, {
  //         senderId: this.currentUserId,
  //         text: payload.message
  //       });

  //     } catch (err) {
  //       console.error(`❌ Fehler beim Senden an ${user.name || user.email}:`, err);
  //     }
  //   });

  //   await Promise.all(promises);
  // }

  private async sendToEmails(emailMentions: string[], payload: any) {
    if (emailMentions.length === 0) return;

    const promises = emailMentions.map(async email => {
      const targetUser = this.participants.find(
        u => u.email?.trim().toLowerCase() === email.toLowerCase()
      );

      if (!targetUser) {
        console.warn(`⚠️ Kein Benutzer mit E-Mail "${email}" gefunden.`);
        return;
      }

      try {
        const dmId = await this.dmService.getOrCreateDmId(this.currentUserId, targetUser.uid);
        await this.dmService.sendMessage(dmId, {
          senderId: this.currentUserId,
          text: payload.message
        });

      } catch (err) {
        console.error(`❌ Fehler beim Senden an E-Mail "${email}":`, err);
      }
    });

    await Promise.all(promises);
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

    if (this.isEmailMention(recipient)) {
      this.openUserByEmail(recipient);
      return;
    }

    console.warn(`⚠️ Empfänger nicht erkannt: ${recipient}`);
  }

  private getFirstRecipient(): string | null {
    const text = this.recipientText.trim();

    const userRegex = /^(?:^|\s)@([A-Za-zÀ-ÖØ-öø-ÿ]+(?:-[A-Za-zÀ-ÖØ-öø-ÿ]+)*(?:\s+[A-Za-zÀ-ÖØ-öø-ÿ]+(?:-[A-Za-zÀ-ÖØ-öø-ÿ]+)*)*)(?=\s+@|\s+(?!@)[A-Za-z0-9._%+-]+@|[\s,]|$)/;
    const userMatch = text.match(userRegex);
    if (userMatch) {
      return '@' + userMatch[1];
    }

    // Full user mention: @Firstname Lastname (Mehrwort!)
    // const userMatch = this.recipientText.match(/^@\s*[\p{L}\p{M}\s]+/u);
    // if (userMatch) return userMatch[0].trim();

    // Channel: #channel
    // const channelMatch = this.recipientText.match(/^#\s*[\w-]+/);
    // if (channelMatch) return channelMatch[0].trim();

    const channelRegex = /^#([A-Za-z0-9_-]+)/;
    const channelMatch = text.match(channelRegex);
    if (channelMatch) {
      return '#' + channelMatch[1];
    }

    // 3. Email
    const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
    const emailMatch = text.match(emailRegex);
    if (emailMatch) {
      return emailMatch[0];
    }

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
      // u => u.name.trim().toLowerCase() === fullName.toLowerCase()
      u => this.normalizeName(u.name) === this.normalizeName(fullName)
    );
  }

  private normalizeName(name: string) {
    return name
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/-+/g, '-')
      .toLowerCase();
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

  private isEmailMention(text: string): boolean {
    return /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(text.trim());
  }

  private openUserByEmail(email: string) {
    const user = this.findUserByEmail(email);
    if (user) {
      this.handleOpenUserChat(user);
    }
  }

  private findUserByEmail(email: string) {
    return this.participants.find(
      u => u.email?.trim().toLowerCase() === email.toLowerCase()
    );
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