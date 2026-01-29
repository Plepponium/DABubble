import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntil } from 'rxjs';
import { User } from '../../models/user.class';
import { ChannelService } from '../../services/channel.service';
import { LogoutService } from '../../services/logout.service';
import { UserService } from '../../services/user.service';
import { RoundBtnComponent } from '../round-btn/round-btn.component';

@Component({
  selector: 'app-add-channel-overlay',
  imports: [RoundBtnComponent, FormsModule, CommonModule],
  templateUrl: './add-channel-overlay.component.html',
  styleUrl: './add-channel-overlay.component.scss'
})
export class AddChannelOverlayComponent implements OnInit {
  @Output() close = new EventEmitter<void>();
  @Output() closeIfNotResponsive = new EventEmitter<void>();
  @Output() createdChannel = new EventEmitter<any>();
  @Input() channels: any[] = [];

  channelName: string = '';
  description: string = '';
  currentUser?: User;
  nameExistsError = false;

  private initialChannelNames: string[] = [];
  private userService = inject(UserService);
  logoutService = inject(LogoutService);
  private destroy$ = this.logoutService.logout$;

  /**
   * Initializes the component by loading the current user and storing
   * the initial channel names for validation.
   */
  ngOnInit(): void {
    this.userService.getCurrentUser().pipe(
      takeUntil(this.destroy$)
    ).subscribe(user => {
      if (user) {
        this.currentUser = user;
      }
    });
    this.initialChannelNames = this.channels.map(channel =>
      channel.name.trim().toLowerCase()
    );
  }

  /**
   * Validates if the entered channel name already exists among existing channels.
   * @returns {boolean} True if the channel name already exists, false otherwise.
   */
  get channelNameExists(): boolean {
    const normalizedName = this.channelName.trim().toLowerCase();
    return this.initialChannelNames.includes(normalizedName);
  }

  /**
   * Closes the overlay by emitting the close event.
   */
  onClose(): void {
    this.close.emit();
  }

  /**
   * Closes the overlay on responsive views by emitting the responsive close event.
   */
  onCloseResponsive(): void {
    this.closeIfNotResponsive.emit();
  }

  /**
   * Creates a new channel with the provided name and description.
   * Validates that the channel name is unique and a user is authenticated
   * before emitting the created channel event.
   */
  onAddChannel(): void {
    if (!this.currentUser || this.channelNameExists) {
      return;
    }
    const channelDraft = {
      name: this.channelName.trim(),
      description: this.description,
      createdBy: this.currentUser.uid,
      createdByName: this.currentUser.name,
      participants: [this.currentUser.uid],
      createdAt: new Date()
    };
    this.createdChannel.emit(channelDraft);
  }
}