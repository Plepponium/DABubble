import { ElementRef, Injectable, QueryList, inject } from '@angular/core';
import { BehaviorSubject, Observable, Subject, takeUntil } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ChatsUiService {
  private destroy$ = new Subject<void>();

  private showChannelDescriptionSubject = new BehaviorSubject<boolean>(false);
  public showChannelDescription$ = this.showChannelDescriptionSubject.asObservable();

  private showUserDialogueSubject = new BehaviorSubject<boolean>(false);
  public showUserDialogue$ = this.showUserDialogueSubject.asObservable();

  private showAllReactionsSubject = new BehaviorSubject<{ [index: number]: boolean }>({});
  public showAllReactions$ = this.showAllReactionsSubject.asObservable();

  private isResponsiveSubject = new BehaviorSubject<boolean>(false);
  public isResponsive$ = this.isResponsiveSubject.asObservable();

  /** Sets the responsive layout state based on screen width. */
  setResponsive(isResponsive: boolean) {
    this.isResponsiveSubject.next(isResponsive);
  }

  /** Toggles the show-all-reactions state for a specific message index. */
  toggleShowAllReactions(index: number) {
    const current = this.showAllReactionsSubject.value;
    this.showAllReactionsSubject.next({
      ...current,
      [index]: !current[index]
    });
  }

  /** Instantly scrolls chat history container to the bottom. */
  scrollToBottom() {
    const chatHistory = document.getElementById('chat-history');
    if (chatHistory) {
      chatHistory.scrollTop = chatHistory.scrollHeight;
    }
  }
  
  /** Smoothly scrolls chat history to the bottom for new messages. */
  scrollToBottomNewMessage() {
    const chatHistory = document.getElementById('chat-history');
    chatHistory?.scrollTo({ top: chatHistory.scrollHeight, behavior: 'smooth' });
  }

  /** Formats chat timestamp as "Heute", "Gestern", or full weekday/date string. */
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

  /** Compares two dates to determine if they fall on the same calendar day. */
  isSameDate(d1: Date, d2: Date): boolean {
    return d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate();
  }

  /** Cleans up service subscriptions and completes destroy subject. */
  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}