import { Component, OnInit } from '@angular/core';
import { AuthLayoutComponent } from '../shared/auth-layout/auth-layout.component';
import { Router, } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SignupDraftService } from '../../services/signup-draft.service';
import { User } from '../../models/user.class';
import { Firestore } from '@angular/fire/firestore';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

@Component({
  selector: 'app-signup-avatar',
  imports: [AuthLayoutComponent, CommonModule],
  templateUrl: './signup-avatar.component.html',
  styleUrl: './signup-avatar.component.scss'
})
export class SignupAvatarComponent implements OnInit {
  avatarImages: string[] = [
    'icon1', 'icon2', 'icon3', 'icon4', 'icon5', 'icon6'];

  selectedAvatar: string = 'default-user';
  showOverlay = false;
  overlayVariant: 'login' | 'created' | 'sent' = 'created';
  draftUser!: User;

  constructor(
    private router: Router,
    private draftService: SignupDraftService,
    private firestore: Firestore
  ) { }

  ngOnInit(): void {
    const draft = this.draftService.getDraft();
    if (!draft) {
      this.router.navigate(['/signup']);
      return;
    }
    this.draftUser = draft;
    if (this.draftUser.img) {
      this.selectedAvatar = this.draftUser.img;
    }
  }

  get draft() {
    return this.draftService.getDraft();
  }

  selectAvatar(avatar: string): void {
    this.selectedAvatar = avatar;
  }

  async register(): Promise<void> {
    if (!this.draftUser) {
      this.router.navigate(['/signup']);
      return;
    }
    this.draftUser.img = this.selectedAvatar;
    this.showOverlay = true;
    this.overlayVariant = 'created';
    try {
      const usersCol = collection(this.firestore, 'users');
      await addDoc(usersCol, {
        name: this.draftUser.name,
        email: this.draftUser.email,
        password: this.draftUser.password,
        img: this.draftUser.img,
        createdAt: serverTimestamp(),
        lastSeen: serverTimestamp(),
        presence: 'offline'
      });
      setTimeout(() => {
        this.draftService.clear();
        this.showOverlay = false;
        this.router.navigate(['/']);
      }, 1500);
    } catch (err) {
      console.error('Fehler beim Anlegen des Users in Firestore:', err);
      this.showOverlay = false;
    }
  }

  onBackClick(): void {
    this.clearDraftIfSignupRoute();
    this.router.navigate(['/signup']);
  }

  private clearDraftIfSignupRoute(): void {
    const currentUrl = this.router.url;
    if (currentUrl.startsWith('/signup')) {
      this.draftService.clear();
    }
  }

}
