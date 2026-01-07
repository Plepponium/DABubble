import { CommonModule } from '@angular/common';
import { Component, Output, EventEmitter, HostListener, Input, SimpleChanges, OnInit, AfterViewInit, OnChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-logout-overlay',
  imports: [CommonModule, FormsModule],
  templateUrl: './logout-overlay.component.html',
  styleUrl: './logout-overlay.component.scss'
})
export class LogoutOverlayComponent implements OnInit, AfterViewInit, OnChanges {
  @Output() close = new EventEmitter<void>();
  @Output() openUser = new EventEmitter<void>();
  @Output() logout = new EventEmitter<void>();

  @Input() closing = false;

  showLogoutOverlayResponsive = false;
  private isResponsive = false;

  ngOnInit() {
    this.isResponsive = window.innerWidth < 880;
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['closing'] && this.closing && this.isResponsive) {
      this.showLogoutOverlayResponsive = false;
      setTimeout(() => this.close.emit(), 350);
    }
  }

  ngAfterViewInit() {
    setTimeout(() => {
      if (this.isResponsive) {
        this.showLogoutOverlayResponsive = true;
      }
    }, 10);
  }

  // handleClose() {
  //   console.log('handleClose START');
  //   this.close.emit();
  // }

  handleOpenUserProfile() {
    this.openUser.emit();
  }

  handleLogout() {
    this.logout.emit();
  }
}
