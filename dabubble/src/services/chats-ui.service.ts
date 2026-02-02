import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ChatsUiService {

  // openReactionsDialogue()
  // openReactionsDialogueBelow()
  // openDialogChannelDescription()
  // openDialogueShowUser()
  // openDialogueAddUser()
  // openEditCommentDialogue()
  // focusInput()
  // scrollToBottom()

  // getChatDate(chat: any): Date | undefined {
  //   return chat.time ? new Date(chat.time * 1000) : undefined;
  // }

  // isSameDate(d1: Date | undefined, d2: Date | undefined): boolean {
  //   if (!d1 || !d2) return false;
  //   return d1.getFullYear() === d2.getFullYear() &&
  //     d1.getMonth() === d2.getMonth() &&
  //     d1.getDate() === d2.getDate();
  // }

  // getDisplayDate(date: Date | undefined): string {
  //   if (!date) return '';
  //   const { today, yesterday } = this.getReferenceDates();

  //   if (this.isSameDate(date, today)) return 'Heute';
  //   if (this.isSameDate(date, yesterday)) return 'Gestern';

  //   return this.formatFullDate(date);
  // }

  // private getReferenceDates() {
  //   const today = new Date();
  //   const yesterday = new Date(today);
  //   yesterday.setDate(today.getDate() - 1);
  //   return { today, yesterday };
  // }

  // private formatFullDate(date: Date): string {
  //   return new Intl.DateTimeFormat('de-DE', {
  //     weekday: 'long',
  //     day: 'numeric',
  //     month: 'long'
  //   }).format(date);
  // }
}