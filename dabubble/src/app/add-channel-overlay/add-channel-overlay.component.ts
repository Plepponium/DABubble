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
  @Output() createdChannel = new EventEmitter<any>();

  @Input() channels: any[] = [];


  channelName: string = '';
  description: string = '';
  currentUser?: User;

  private userService = inject(UserService);
  private channelService = inject(ChannelService);

  ngOnInit() {
    this.userService.getCurrentUser().subscribe(user => {
      if (user) this.currentUser = user;
    });
  }

  handleClose() {
    this.close.emit();
  }

  get channelNameExists(): boolean {
    const name = this.channelName.trim().toLowerCase();
    return this.channels.some(c => c.name.trim().toLowerCase() === name);
  }


  handleAddChannel() {
    if (!this.currentUser || this.channelNameExists) return;

    const newChannel = {
      name: this.channelName.trim(),
      description: this.description,
      createdBy: this.currentUser.uid,
      createdByName: this.currentUser.name,
      participants: [this.currentUser.uid],
      createdAt: new Date()
    };

    this.channelService.addChannel(newChannel).then(channelRef => {
      this.createdChannel.emit({ id: channelRef.id, ...newChannel });
      this.handleClose();
    });
  }

}
