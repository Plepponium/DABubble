import { Component, Output, EventEmitter, inject, OnInit } from '@angular/core';
import { RoundBtnComponent } from '../round-btn/round-btn.component';
import { ChannelService } from '../../services/channel.service';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../services/user.service';
import { User } from '../../models/user.class';

@Component({
  selector: 'app-add-channel-overlay',
  imports: [RoundBtnComponent, FormsModule],
  templateUrl: './add-channel-overlay.component.html',
  styleUrl: './add-channel-overlay.component.scss'
})
export class AddChannelOverlayComponent implements OnInit {

  @Output() close = new EventEmitter<void>();
  @Output() createdChannel = new EventEmitter<any>();

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

  handleAddChannel() {
    if (!this.currentUser) return;
    const newChannel = {
      name: this.channelName,
      description: this.description,
      createdBy: this.currentUser.uid,
      createdByName: this.currentUser.name,
      participants: [this.currentUser.uid],
      createdAt: new Date()
    };
    this.channelService.addChannel(newChannel).then(channelRef => {
      const channelWithId = { id: channelRef.id, ...newChannel };
      this.createdChannel.emit(channelWithId);
      this.handleClose();
    });
  }
}
