import { ElementRef, Injectable, QueryList, inject } from '@angular/core';
import { BehaviorSubject, Observable, Subject, takeUntil } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ChatsUiService {
  private destroy$ = new Subject<void>();

  // ✅ UI States als BehaviorSubjects
  private showChannelDescriptionSubject = new BehaviorSubject<boolean>(false);
  public showChannelDescription$ = this.showChannelDescriptionSubject.asObservable();

  private showUserDialogueSubject = new BehaviorSubject<boolean>(false);
  public showUserDialogue$ = this.showUserDialogueSubject.asObservable();

  private showAllReactionsSubject = new BehaviorSubject<{ [index: number]: boolean }>({});
  public showAllReactions$ = this.showAllReactionsSubject.asObservable();

  private isResponsiveSubject = new BehaviorSubject<boolean>(false);
  public isResponsive$ = this.isResponsiveSubject.asObservable();

  setResponsive(isResponsive: boolean) {
    this.isResponsiveSubject.next(isResponsive);
  }

  toggleShowAllReactions(index: number) {
    const current = this.showAllReactionsSubject.value;
    this.showAllReactionsSubject.next({
      ...current,
      [index]: !current[index]
    });
  }

  // ✅ Scroll & DOM Utilities
  // scrollToBottom() {
  //   const chatHistory = document.getElementById('chat-history');
  //   if (chatHistory) {
  //     chatHistory.scrollTop = chatHistory.scrollHeight;
  //   }
  // }
  scrollToBottom() {
    const chatHistory = document.getElementById('chat-history');
    chatHistory?.scrollTo({ top: chatHistory.scrollHeight, behavior: 'smooth' });
  }

  // ✅ Date Formatting (UI-Logik)
  getDisplayDate(chatTime: number | undefined): string {
    if (!chatTime) return '';
    const date = new Date(chatTime * 1000);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    if (this.isSameDate(date, today)) return 'Heute';
    if (this.isSameDate(date, yesterday)) return 'Gestern';

    return new Intl.DateTimeFormat('de-DE', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    }).format(date);
  }

  private isSameDate(d1: Date, d2: Date): boolean {
    return d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}