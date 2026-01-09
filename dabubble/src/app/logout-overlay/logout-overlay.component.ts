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
  @Input() resetActive = false;

  showLogoutOverlayResponsive = false;
  private isResponsive = false;
  buttonActive = false;

  ngOnInit() {
    this.isResponsive = window.innerWidth < 880;
  }

  ngOnChanges(changes: SimpleChanges) {
    // if (changes['closing'] && this.closing && this.isResponsive) {
    //   this.showLogoutOverlayResponsive = false;
    //   this.buttonActive = false;
    //   setTimeout(() => this.close.emit(), 350);
    // }

    if (changes['closing']) {
      if (this.closing && this.isResponsive) {
        this.showLogoutOverlayResponsive = false;
        this.buttonActive = false;
        setTimeout(() => this.close.emit(), 350);
      }
    } 

    if (changes['resetActive'] && !this.resetActive) {
      this.buttonActive = false;
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
    this.buttonActive = true;
    this.openUser.emit();
  }

  handleLogout() {
    this.logout.emit();
  }
}
