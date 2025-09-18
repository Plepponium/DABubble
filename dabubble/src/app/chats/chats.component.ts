import { Component, Output, EventEmitter, Input, inject, OnChanges, SimpleChanges, OnInit } from '@angular/core';
import { CommonModule, registerLocaleData } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { RoundBtnComponent } from '../round-btn/round-btn.component';
import { DialogueOverlayComponent } from '../dialogue-overlay/dialogue-overlay.component';
import { ProfileOverlayComponent } from '../profile-overlay/profile-overlay.component';
import { ChatAddUserOverlayComponent } from '../chat-add-user-overlay/chat-add-user-overlay.component';
import { ChannelDescriptionOverlayComponent } from '../channel-description-overlay/channel-description-overlay.component';
import { ChannelService } from '../../services/channel.service';
import { UserService } from '../../services/user.service';
// import { User } from 'firebase/auth';
import { User } from '../../models/user.class';
import { forkJoin, map, of, Subject, switchMap, take, takeUntil } from 'rxjs';
import localeDe from '@angular/common/locales/de';
registerLocaleData(localeDe);

@Component({
  selector: 'app-chats',
  imports: [CommonModule, FormsModule, MatFormFieldModule, MatInputModule, MatIconModule, MatButtonModule, RoundBtnComponent, DialogueOverlayComponent, ProfileOverlayComponent, ChatAddUserOverlayComponent, ChannelDescriptionOverlayComponent],
  templateUrl: './chats.component.html',
  styleUrl: './chats.component.scss',
})
export class ChatsComponent implements OnInit, OnChanges {
  value = 'Clear me';
  showChannelDescription = false;
  showUserDialogue = false;
  showAddDialogue = false;
  usersDisplayActive = false;
  showProfileDialogue = false;
  editCommentDialogueExpanded = false;
  channelName = '';
  participantIds: string[] = [];
  participants: User[] = [];
  channelChats: any[] = [];

  channelService = inject(ChannelService);
  userService = inject(UserService);

  @Input() channelId?: string;
  @Output() openThread = new EventEmitter<void>();
  // private channelIdChange$ = new Subject<void>();

  ngOnInit() {
    if (!this.channelId) {
      this.loadFirstChannelAndData();
    } else {
      this.loadDataForChannel(this.channelId);
    }
  }

  // Lädt die erste verfügbare Channel-ID plus alle zugehörigen Daten
  private loadFirstChannelAndData() {
    this.channelService.getChannels().pipe(
      switchMap(channels => {
        if (channels.length > 0) {
          this.channelId = channels[0].id;
          this.channelName = channels[0].name;
          this.participantIds = channels[0].participants;
          return this.loadChatsAndUsers(this.channelId, this.participantIds);
        } else {
          return of([[], []]);
        }
      })
    ).subscribe(([chatsWithAnswers, users]) => {
      this.participants = users;
      this.channelChats = chatsWithAnswers;
      // console.log('Daten geladen für Erst-Channel:', this.channelId);
    });
  }

  // Lädt alle nötigen Daten für eine konkrete Channel-ID
  private loadDataForChannel(channelId: string) {
    // Vorher bestehende Abos abbrechen
    // this.channelIdChange$.next();
    this.channelService.getChannelById(channelId).pipe(
      switchMap(channel => {
        this.channelName = channel?.name ?? '';
        this.participantIds = channel?.participants ?? [];
        const channelData = this.loadChatsAndUsers(channelId, this.participantIds);
        return channelData;
      }),
      // takeUntil(this.channelIdChange$)  // Beispiel für Abbrechen bei neuem ChannelId-Change (optional)
    ).subscribe(([chatsWithAnswers, users]) => {
      if (this.channelId === channelId) {  // nur setzen, wenn der Kanal noch der erwartete ist
        this.participants = users;
        this.channelChats = chatsWithAnswers;
        // console.log('Daten geladen für Channel:', channelId);
      }
    });
  }

  // Lädt Chats und Userdaten parallel und verknüpft Antworten mit Chats
  private loadChatsAndUsers(channelId: string, participantIds: string[]) {
    return forkJoin([
      this.channelService.getChatsForChannel(channelId).pipe(take(1)),
      this.userService.getUsersByIds(participantIds).pipe(take(1))
    ]).pipe(
      switchMap(([chats, users]) => {
        if (!chats.length) {
          // Wenn keine Chats, trotzdem Users zurückliefern (und leere chats)
          return of([[], users] as [any[], User[]]);
        }
        const chatsWithAnswers$ = chats.map(chat =>
          this.channelService.getAnswersForChat(channelId, chat.id).pipe(
            take(1),
            map(answers => {
              const user = users.find(u => u.uid === chat.user);
              const chatWithAnswers = {
                ...chat,
                userName: user?.name,
                userImg: user?.img,
                answersCount: answers.length,
                lastAnswerTime: answers.length > 0 ? answers[answers.length - 1].time : null
              };
              // console.log(`answersCount für Chat ${chat.id}:`, chatWithAnswers.answersCount);
              return chatWithAnswers;
            })
          )
        );
        // console.log('loadChatsAndUsers participants', this.participants);
        return forkJoin(chatsWithAnswers$).pipe(
          map(chatsWithAnswers => [chatsWithAnswers, users] as [any[], User[]])
        );
      })
    );
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['channelId']) {
      const newChannelId = changes['channelId'].currentValue;
      if (newChannelId) {
        this.channelChats = [];
        this.participants = [];
        this.channelName = '';
        this.loadDataForChannel(newChannelId);
      }
    }
  }

  openDialogChannelDescription() {
    this.showChannelDescription = true;
  };

  closeDialogChannelDescription() {
    this.showChannelDescription = false;
  }

  openDialogueShowUser() {
    this.showUserDialogue = true;
    this.usersDisplayActive = true;
  }

  closeDialogueShowUser() {
    this.showUserDialogue = false;
    if (this.showAddDialogue = false) {
      this.usersDisplayActive = false;
    }
  }

  openDialogueAddUser() {
    this.showAddDialogue = true;
    this.showUserDialogue = false;
  }

  closeDialogueAddUser() {
    this.showAddDialogue = false;
    this.usersDisplayActive = false;
  }

  openDialogueShowProfile() {
    this.showProfileDialogue = true;
  }

  closeDialogueShowProfile() {
    this.showProfileDialogue = false;
  }


  //zum speichern von time in firebase (noch nicht in Verwendung)
  handleAddChatToChannel() {
    const date = new Date('2024-05-08T12:13:00Z'); // Z für UTC
    const unixTimestamp = Math.floor(date.getTime() / 1000);
    console.log(unixTimestamp); // 1702061580
  }

  addToChats() { }

  handleOpenThread() {
    this.openThread.emit();
  }

  openEditCommentDialogue() {
    this.editCommentDialogueExpanded = !this.editCommentDialogueExpanded;
  }
}
