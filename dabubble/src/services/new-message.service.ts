import { Injectable } from '@angular/core';
import { Channel } from '../models/channel.class';
import { User } from '../models/user.class';
import { DirectMessageService } from './direct-messages.service';
import { ChannelService } from './channel.service';

@Injectable({ providedIn: 'root' })
export class NewMessageService {

    /** Inserts a smiley token at the given selection and returns updated text and caret. */
    insertSmiley(currentText: string, smiley: string, selectionStart: number, selectionEnd: number): { text: string; caret: number } {
        return this.insertToken(currentText, `:${smiley}:`, selectionStart, selectionEnd, smiley.length + 2
        );
    }

    /** Inserts a character at the given selection and returns updated text and caret. */
    insertAtCursor(currentText: string, character: string, selectionStart: number, selectionEnd: number): { text: string; caret: number } {
        return this.insertToken(currentText, character, selectionStart, selectionEnd, character.length);
    }

    /** Inserts a generic token at the given selection and returns updated text and caret. */
    private insertToken(text: string, token: string, selectionStart: number, selectionEnd: number, caretOffset: number): { text: string; caret: number } {
        const before = text.slice(0, selectionStart);
        const after = text.slice(selectionEnd);
        const newText = before + token + after;
        const caret = selectionStart + caretOffset;
        return { text: newText, caret };
    }

    /** Inserts or replaces a mention token in the message text based on caret index. */
    insertMentionInMessage(text: string, event: { name: string; type: 'user' | 'channel' | 'email' }, mentionCaretIndex: number | null): { text: string; caret: number } {
        const trigger = event.type === 'user' ? '@' : '#';
        const pos = mentionCaretIndex ?? text.length;
        return this.replaceMentionToken(text, pos, `${trigger}${event.name}`, /(@[A-Za-zÀ-ÖØ-öø-ÿ0-9_-]*|#[A-Za-z0-9_-]*|[A-Za-z0-9._%+-]+)$/);
    }

    /** Inserts or replaces a mention token in the recipient text based on caret index. */
    insertMentionInRecipient(text: string, event: { name: string; type: 'user' | 'channel' | 'email' }, caretIndex: number | null): { text: string; caret: number } {
        const pos = caretIndex ?? text.length;
        const insertValue = this.buildRecipientInsertValue(event);
        return this.replaceMentionToken(text, pos, insertValue, /(?:@[A-Za-zÀ-ÖØ-öø-ÿ0-9_-]*|#[A-Za-z0-9_-]*|[A-Za-z0-9._%+-]+)$/);
    }

    /** Replaces the last mention-like token before caret with the given value. */
    private replaceMentionToken(text: string, caret: number, insertValue: string, triggerRegex: RegExp): { text: string; caret: number } {
        const before = text.slice(0, caret);
        const after = text.slice(caret);
        const replaced = before.replace(triggerRegex, insertValue);
        const newText = replaced + ' ' + after;
        const newCaret = replaced.length + 1;
        return { text: newText, caret: newCaret };
    }

    /** Builds the insert value for a recipient based on mention type. */
    private buildRecipientInsertValue(event: { name: string; type: 'user' | 'channel' | 'email' }): string {
        if (event.type === 'user') return `@${event.name}`;
        if (event.type === 'channel') return `#${event.name}`;
        return event.name;
    }

    /** Parses raw text into user, channel and email recipient lists. */
    parseRecipients(text: string): { userMentions: string[]; channelMentions: string[]; emailMentions: string[]; } {
        const userMentions = this.extractUsers(text);
        const channelMentions = this.extractChannels(text);
        const emailMentions = this.extractEmails(text);
        return { userMentions, channelMentions, emailMentions };
    }

    /** Extracts user mentions from text using the user mention regex. */
    private extractUsers(text: string): string[] {
        const userRegex =
            /(?:^|\s)@([A-Za-zÀ-ÖØ-öø-ÿ]+(?:-[A-Za-zÀ-ÖØ-öø-ÿ]+)*(?:\s+[A-Za-zÀ-ÖØ-öø-ÿ]+(?:-[A-Za-zÀ-ÖØ-öø-ÿ]+)*)*)(?=\s+@|\s+(?!@)[A-Za-z0-9._%+-]+@|[\s,]|$)/g;
        const users: string[] = [];
        let match: RegExpExecArray | null;
        while ((match = userRegex.exec(text)) !== null) {
            users.push(match[1].trim());
        }
        return users;
    }

    /** Extracts channel mentions from text using the channel regex. */
    private extractChannels(text: string): string[] {
        const channelRegex = /#([A-Za-z0-9_-]+)/g;
        const channels: string[] = [];
        let match: RegExpExecArray | null;
        while ((match = channelRegex.exec(text)) !== null) {
            channels.push(match[1]);
        }
        return channels;
    }

    /** Extracts email addresses from the given text using an email regex. */
    private extractEmails(text: string): string[] {
        const emailRegex = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
        return text.match(emailRegex) || [];
    }

    /** Builds the payload object for a new message with trimmed text and timestamp. */
    buildMessagePayload(message: string, currentUserId: string) {
        return {
            message: message.trim(),
            time: Math.floor(Date.now() / 1000),
            user: currentUserId
        };
    }

    /** Sends a message payload to all mentioned channels. */
    async sendToChannels(channelMentions: string[], payload: any, filteredChannels: Channel[], channelService: ChannelService) {
        if (!channelMentions.length) return;
        const promises = channelMentions.map(name =>
            this.sendToSingleChannel(name, payload, filteredChannels, channelService)
        );
        await Promise.all(promises);
    }

    /** Sends a message payload to a single resolved channel. */
    private async sendToSingleChannel(name: string, payload: any, filteredChannels: Channel[], channelService: ChannelService) {
        const channel = filteredChannels.find(c => c.name === name);
        if (!channel) {
            console.warn(`⚠️ Channel "${name}" nicht gefunden.`);
            return;
        }
        await channelService.addChatToChannel(channel.id, payload);
    }

    /** Sends a message payload via DM to all mentioned users. */
    async sendToUsers(userMentions: string[], payload: any, participants: User[], currentUserId: string, dmService: DirectMessageService) {
        if (!userMentions.length) return;
        const promises = userMentions.map(fullName =>
            this.sendToSingleUser(fullName, payload, participants, currentUserId, dmService)
        );
        await Promise.all(promises);
    }

    /** Sends a message payload via DM to a single resolved user. */
    private async sendToSingleUser(fullName: string, payload: any, participants: User[], currentUserId: string, dmService: DirectMessageService) {
        const targetUser = this.findUserByName(fullName, participants);
        if (!targetUser) {
            console.warn(`⚠️ Benutzer "${fullName}" nicht gefunden.`);
            return;
        }
        await this.sendDmMessage(currentUserId, targetUser.uid, payload.message, dmService, fullName);
    }

    /** Sends a message payload via DM to all users resolved from email mentions. */
    async sendToEmails(emailMentions: string[], payload: any, participants: User[], currentUserId: string, dmService: DirectMessageService) {
        if (!emailMentions.length) return;
        const promises = emailMentions.map(email =>
            this.sendToSingleEmail(email, payload, participants, currentUserId, dmService)
        );
        await Promise.all(promises);
    }

    /** Sends a message payload via DM to a single user resolved from email. */
    private async sendToSingleEmail(email: string, payload: any, participants: User[], currentUserId: string, dmService: DirectMessageService) {
        const targetUser = this.findUserByEmail(email, participants);
        if (!targetUser) {
            console.warn(`⚠️ Kein Benutzer mit E-Mail "${email}" gefunden.`);
            return;
        }
        await this.sendDmMessage(currentUserId, targetUser.uid, payload.message, dmService, email);
    }

    /** Sends a DM message and logs an error including an identifier on failure. */
    private async sendDmMessage(currentUserId: string, targetUserId: string, text: string, dmService: DirectMessageService, identifier: string) {
        try {
            const dmId = await dmService.getOrCreateDmId(currentUserId, targetUserId);
            await dmService.sendMessage(dmId, { senderId: currentUserId, text });
        } catch (err) {
            console.error(`❌ Fehler beim Senden an ${identifier}:`, err);
        }
    }

    /** Returns the first recipient in text (user, channel or email) or null. */
    getFirstRecipient(text: string): string | null {
        const trimmed = text.trim();
        return (
            this.matchFirstUser(trimmed) ??
            this.matchFirstChannel(trimmed) ??
            this.matchFirstEmail(trimmed)
        );
    }

    /** Matches and returns the first user mention at the beginning of the text. */
    private matchFirstUser(text: string): string | null {
        const userRegex =
            /^(?:^|\s)@([A-Za-zÀ-ÖØ-öø-ÿ]+(?:-[A-Za-zÀ-ÖØ-öø-ÿ]+)*(?:\s+[A-Za-zÀ-ÖØ-öø-ÿ]+(?:-[A-Za-zÀ-ÖØ-öø-ÿ]+)*)*)(?=\s+@|\s+(?!@)[A-Za-z0-9._%+-]+@|[\s,]|$)/;
        const match = text.match(userRegex);
        return match ? '@' + match[1] : null;
    }


    /** Matches and returns the first channel mention at the beginning of the text. */
    private matchFirstChannel(text: string): string | null {
        const channelRegex = /^#([A-Za-z0-9_-]+)/;
        const match = text.match(channelRegex);
        return match ? '#' + match[1] : null;
    }

    /** Matches and returns the first email address at the beginning of the text. */
    private matchFirstEmail(text: string): string | null {
        const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
        const match = text.match(emailRegex);
        return match ? match[0] : null;
    }

    /** Strips the leading mention character and trims the remaining name. */
    extractMentionName(mention: string): string {
        return mention.substring(1).trim();
    }

    /** Returns true if the text looks like a user mention. */
    isUserMention(text: string): boolean {
        return text.startsWith('@');
    }

    /** Returns true if the text looks like a channel mention. */
    isChannelMention(text: string): boolean {
        return text.startsWith('#');
    }

    /** Returns true if the text is a valid email address pattern. */
    isEmailMention(text: string): boolean {
        return /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(text.trim());
    }

    /** Finds a user by display name using a normalized comparison. */
    findUserByName(name: string, participants: User[]): User | undefined {
        return participants.find(
            u => this.normalizeName(u.name) === this.normalizeName(name)
        );
    }

    /** Finds a user by email using a normalized email comparison. */
    findUserByEmail(email: string, participants: User[]): User | undefined {
        return participants.find(
            u => u.email?.trim().toLowerCase() === email.toLowerCase()
        );
    }

    /** Finds a channel by name using a normalized channel name comparison. */
    findChannelByName(name: string, channels: Channel[]): Channel | undefined {
        return channels.find(
            c => c.name.trim().toLowerCase() === name.toLowerCase()
        );
    }

    /** Normalizes a name by trimming, collapsing spaces/dashes and lowercasing. */
    private normalizeName(name: string) {
        return name.trim().replace(/\s+/g, ' ').replace(/-+/g, '-').toLowerCase();
    }
}
