import { Component, ElementRef, EventEmitter, inject, Input, Output, ViewChild } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { User } from '../../models/user.class';
import { UserService } from '../../services/user.service';
import { Observable } from 'rxjs';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MentionsOverlayComponent } from '../shared/mentions-overlay/mentions-overlay.component';

@Component({
  selector: 'app-header',
  imports: [MatIconModule, MatButtonModule, CommonModule, FormsModule, MentionsOverlayComponent],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent {
  @Output() openLogoutOverlay = new EventEmitter<void>();
  @Output() openUserProfile = new EventEmitter<void>();

  @Input() users: any[] = [];
  @Input() channels: any[] = [];
  @Input() currentUser: User | undefined;

  searchText = '';
  caretIndex: number | null = null;
  overlayActive = false;

  userService = inject(UserService)
  router = inject(Router);

  get relevantChannels() {
    if (!this.currentUser) return [];
    return this.channels.filter(c => c.participants?.includes(this.currentUser?.uid));
  }

  updateCaret(el: HTMLInputElement) {
    if (!el) return;
    this.caretIndex = el.selectionStart || 0;
  }

  // --- under construction ---
  onMentionPicked(event: { name: string; type: 'user' | 'channel' | 'email' }, el: HTMLInputElement) {
    const pos = this.caretIndex ?? this.searchText.length;
    const before = this.searchText.slice(0, pos);
    const after = this.searchText.slice(pos);

    const insertValue =
      event.type === 'user' ? `@${event.name}` :
        event.type === 'channel' ? `#${event.name}` : event.name;

    this.searchText = before + insertValue + ' ' + after;
    this.caretIndex = before.length + insertValue.length + 1;

    setTimeout(() => {
      el.focus();
      el.selectionStart = el.selectionEnd = this.caretIndex;
    });
  }
  // --- under construction ---

  getAvatarImg(user?: User): string {
    return user?.img || 'default-user';
  }

  openDialogueLogout() {
    this.openLogoutOverlay.emit();
  }

  openProfileFromHeader() {
    this.openUserProfile.emit();
  }

  logout() {
    this.userService.logout().then(() => {
      this.router.navigate(['/']);
    });
  }
}
