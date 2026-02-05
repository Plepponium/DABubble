// import { Injectable } from '@angular/core';

// @Injectable({ providedIn: 'root' })
// export class ChatsUiService {

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
// }

import { ElementRef, Injectable, QueryList, inject } from '@angular/core';
import { BehaviorSubject, Observable, Subject, takeUntil } from 'rxjs';
import { User } from '../models/user.class';
import { Chat } from '../models/chat.class';

@Injectable({ providedIn: 'root' })
export class ChatsUiService {
  private destroy$ = new Subject<void>();

  // ✅ UI States als BehaviorSubjects
  private showChannelDescriptionSubject = new BehaviorSubject<boolean>(false);
  public showChannelDescription$ = this.showChannelDescriptionSubject.asObservable();

  private showUserDialogueSubject = new BehaviorSubject<boolean>(false);
  public showUserDialogue$ = this.showUserDialogueSubject.asObservable();

  private showAddDialogueSubject = new BehaviorSubject<boolean>(false);
  public showAddDialogue$ = this.showAddDialogueSubject.asObservable();

  private showAddDialogueResponsiveSubject = new BehaviorSubject<boolean>(false);
  public showAddDialogueResponsive$ = this.showAddDialogueResponsiveSubject.asObservable();

  private usersDisplayActiveSubject = new BehaviorSubject<boolean>(false);
  public usersDisplayActive$ = this.usersDisplayActiveSubject.asObservable();

  private editCommentDialogueExpandedSubject = new BehaviorSubject<boolean>(false);
  public editCommentDialogueExpanded$ = this.editCommentDialogueExpandedSubject.asObservable();

  private activeReactionDialogueIndexSubject = new BehaviorSubject<number | null>(null);
  public activeReactionDialogueIndex$ = this.activeReactionDialogueIndexSubject.asObservable();

  private activeReactionDialogueBelowIndexSubject = new BehaviorSubject<number | null>(null);
  public activeReactionDialogueBelowIndex$ = this.activeReactionDialogueBelowIndexSubject.asObservable();

  private overlayActiveSubject = new BehaviorSubject<boolean>(false);
  public overlayActive$ = this.overlayActiveSubject.asObservable();

  private activeSmileySubject = new BehaviorSubject<boolean>(false);
  public activeSmiley$ = this.activeSmileySubject.asObservable();

  private showAllReactionsSubject = new BehaviorSubject<{ [index: number]: boolean }>({});
  public showAllReactions$ = this.showAllReactionsSubject.asObservable();

  private isResponsiveSubject = new BehaviorSubject<boolean>(false);
  public isResponsive$ = this.isResponsiveSubject.asObservable();

  private pendingScrollSubject = new BehaviorSubject<boolean>(false);
  public pendingScroll$ = this.pendingScrollSubject.asObservable();

  // ✅ UI Actions (toggle, open, close)
  openChannelDescription() {
    this.showChannelDescriptionSubject.next(true);
  }

  closeChannelDescription() {
    this.showChannelDescriptionSubject.next(false);
  }

  toggleUserDialogue(open: boolean) {
    this.showUserDialogueSubject.next(open);
    if (!open) this.usersDisplayActiveSubject.next(false);
  }

  toggleAddDialogue(responsive = false) {
    this.showAddDialogueSubject.next(true);
    this.showAddDialogueResponsiveSubject.next(responsive);
    this.showUserDialogueSubject.next(false);
  }

  closeAddDialogue() {
    this.showAddDialogueSubject.next(false);
    this.showAddDialogueResponsiveSubject.next(false);
    this.usersDisplayActiveSubject.next(false);
  }

  toggleEditCommentDialogue() {
    const current = this.editCommentDialogueExpandedSubject.value;
    this.editCommentDialogueExpandedSubject.next(!current);
    if (!current) {
      this.activeReactionDialogueIndexSubject.next(null);
      this.activeReactionDialogueBelowIndexSubject.next(null);
    }
  }

  setReactionDialogue(index: number | null, below = false) {
    if (below) {
      this.activeReactionDialogueBelowIndexSubject.next(index);
      this.activeReactionDialogueIndexSubject.next(null);
    } else {
      this.activeReactionDialogueIndexSubject.next(index);
      this.activeReactionDialogueBelowIndexSubject.next(null);
    }
  }

  setOverlayActive(active: boolean) {
    this.overlayActiveSubject.next(active);
  }

  toggleSmileyOverlay() {
    this.activeSmileySubject.next(!this.activeSmileySubject.value);
  }

  setResponsive(isResponsive: boolean) {
    this.isResponsiveSubject.next(isResponsive);
  }

  setPendingScroll(pending: boolean) {
    this.pendingScrollSubject.next(pending);
  }

  toggleShowAllReactions(index: number) {
    const current = this.showAllReactionsSubject.value;
    this.showAllReactionsSubject.next({
      ...current,
      [index]: !current[index]
    });
  }

  // ✅ Scroll & DOM Utilities
  scrollToBottom() {
    const chatHistory = document.getElementById('chat-history');
    if (chatHistory) {
      chatHistory.scrollTop = chatHistory.scrollHeight;
    }
  }

  scrollToMessage(messageId: string, chatSections: QueryList<ElementRef<HTMLElement>>) {
    const chatSection = chatSections
      .find(section => section.nativeElement.dataset['messageId'] === messageId)
      ?.nativeElement;

    if (chatSection) {
      chatSection.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest'
      });
    }
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

  getMaxReactionsToShow(chat: any, index: number, isResponsive: boolean): any[] {
    const max = isResponsive ? 3 : 7;
    const showAll = this.showAllReactionsSubject.value[index];
    return showAll ? chat.reactionArray : chat.reactionArray.slice(0, max);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}