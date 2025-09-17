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
import { forkJoin, of, switchMap, take } from 'rxjs';
import localeDe from '@angular/common/locales/de';
registerLocaleData(localeDe);

@Component({
  selector: 'app-chats',
  imports: [CommonModule, FormsModule, MatFormFieldModule, MatInputModule, MatIconModule, MatButtonModule, RoundBtnComponent, DialogueOverlayComponent, ProfileOverlayComponent, ChatAddUserOverlayComponent, ChannelDescriptionOverlayComponent],
  templateUrl: './chats.component.html',
  styleUrl: './chats.component.scss',
  // providers: [ChannelService],
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


  // ngOnInit() {
  //   if (!this.channelId) {
  //     this.channelService.getChannels().pipe(
  //       switchMap(channels => {
  //         if (channels.length > 0) {
  //           this.channelId = channels[0].id;
  //           this.channelName = channels[0].name;
  //           this.participantIds = channels[0].participants;
  //           return this.userService.getUsersByIds(this.participantIds);
  //         } else {
  //           return of([]);
  //         }
  //       })
  //     ).subscribe(users => {
  //       this.participants = users;
  //     });
  //   }
  //   if (this.channelId) {
  //     this.channelService.getChatsForChannel(this.channelId).subscribe(chats => {
  //       console.log(chats);
  //       this.channelChats = chats;
  //     });
  //   }
  // }
  // ngOnInit() {
  //   if (!this.channelId) {
  //     console.log('no channelId');
  //     this.channelService.getChannels().pipe(
  //       switchMap(channels => {
  //         if (channels.length > 0) {
  //           this.channelId = channels[0].id;
  //           console.log('channelId', this.channelId);
  //           this.channelName = channels[0].name;
  //           console.log('channelName', this.channelName);
  //           this.participantIds = channels[0].participants;
  //           console.log('participantIds', this.participantIds);
  //           return this.userService.getUsersByIds(this.participantIds);
  //         } else {
  //           return of([]);
  //         }
  //       })
  //     ).subscribe(users => {
  //       this.participants = users;
  //     });
  //   }
  //   if (this.channelId) {
  //     this.channelService.getChatsForChannel(this.channelId).subscribe(chats => {
  //       console.log(chats);
  //       this.channelChats = chats;
  //     });
  //   }
  //   if (this.channelId) {
  //     // Lade beide parallel oder nacheinander:
  //     forkJoin([
  //       this.channelService.getChatsForChannel(this.channelId).pipe(take(1)),
  //       this.userService.getUsersByIds(this.participantIds).pipe(take(1)),
  //     ]).subscribe(([chats, users]) => {
  //       this.participants = users;

  //       // Nun Chats mit User ergänzen:
  //       this.channelChats = chats.map(chat => {
  //         const user = this.participants.find(u => u.uid === chat.user);
  //         return { ...chat, userName: user?.name, userImg: user?.img };
  //       });
  //     });
  //   }
  // }
  ngOnInit() {
    if (!this.channelId) {
      // Kein ChannelId: Lade erst alle Channels und nutze den ersten
      this.channelService.getChannels().pipe(
        switchMap(channels => {
          if (channels.length > 0) {
            this.channelId = channels[0].id;
            this.channelName = channels[0].name;
            this.participantIds = channels[0].participants;
            // Jetzt beide Daten (Chats + Nutzer) parallel laden
            return forkJoin([
              this.channelService.getChatsForChannel(this.channelId).pipe(take(1)),
              this.userService.getUsersByIds(this.participantIds).pipe(take(1))
            ]);
          } else {
            return of([[], []]); // leere Chats + Nutzer
          }
        })
      ).subscribe(([chats, users]) => {
        this.participants = users;
        this.channelChats = chats.map(chat => {
          const user = this.participants.find(u => u.uid === chat.user);
          return { ...chat, userName: user?.name, userImg: user?.img };
        });
      });
    } else if (this.channelId) {
      // ChannelId ist bereits bekannt - Chats und Teilnehmer laden
      this.channelService.getChannelById(this.channelId).pipe(
        switchMap(channel => {
          this.channelName = channel?.name ?? '';
          this.participantIds = channel?.participants ?? [];
          return forkJoin([
            this.channelService.getChatsForChannel(this.channelId!).pipe(take(1)),
            this.userService.getUsersByIds(this.participantIds).pipe(take(1))
          ]);
        })
      ).subscribe(([chats, users]) => {
        this.participants = users;
        this.channelChats = chats.map(chat => {
          const user = this.participants.find(u => u.uid === chat.user);
          return { ...chat, userName: user?.name, userImg: user?.img };
        });
      });
    }
  }
  
  ngOnChanges(changes: SimpleChanges) {
    if (changes['channelId'] && this.channelId) {
      this.channelService.getChannelById(this.channelId).pipe(
        switchMap(channel => {
          this.channelName = channel?.name ?? '';
          this.participantIds = channel?.participants ?? [];
          return this.userService.getUsersByIds(this.participantIds);
        })
      ).subscribe(users => {
        this.participants = users;
      });
    }
    if (changes['channelId'] && this.channelId) {
      this.channelService.getChatsForChannel(this.channelId).subscribe(chats => {
        this.channelChats = chats;
      });
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
