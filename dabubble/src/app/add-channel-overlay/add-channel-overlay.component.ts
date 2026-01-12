import { Component, Output, EventEmitter, inject, OnInit, Input } from '@angular/core';
import { RoundBtnComponent } from '../round-btn/round-btn.component';
import { ChannelService } from '../../services/channel.service';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../services/user.service';
import { User } from '../../models/user.class';
import { CommonModule } from '@angular/common';

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
  private initialChannelNames: string[] = [];  // Namen beim Öffnen
  nameExistsError = false;

  private userService = inject(UserService);
  private channelService = inject(ChannelService);

  ngOnInit() {
    this.userService.getCurrentUser().subscribe(user => {
      if (user) this.currentUser = user;
    });

    this.initialChannelNames = this.channels.map(c =>
      c.name.trim().toLowerCase()
    );
  }

  handleClose() {
    this.close.emit();
  }

  handleCloseResponsive() {
    console.log('closeResponsive');
    this.closeIfNotResponsive.emit();
  }

  get channelNameExists(): boolean {
    const name = this.channelName.trim().toLowerCase();
    // return this.channels.some(c => c.name.trim().toLowerCase() === name);
    return this.initialChannelNames.includes(name);
  }

  handleAddChannel() {
    if (!this.currentUser || this.channelNameExists) return;

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