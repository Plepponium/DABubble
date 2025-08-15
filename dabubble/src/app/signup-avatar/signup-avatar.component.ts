import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthLayoutComponent } from '../shared/auth-layout/auth-layout.component';
import { CommonModule } from '@angular/common';
import { SignupDraftService } from '../../services/signup-draft.service';
import { User } from '../../models/user.class';

import { Auth, createUserWithEmailAndPassword } from '@angular/fire/auth';
import { Firestore, doc, setDoc, serverTimestamp } from '@angular/fire/firestore';

@Component({
  selector: 'app-signup-avatar',
  standalone: true,
  imports: [AuthLayoutComponent, CommonModule],
  templateUrl: './signup-avatar.component.html',
  styleUrl: './signup-avatar.component.scss'
})
export class SignupAvatarComponent implements OnInit {

  avatarImages: string[] = ['icon1', 'icon2', 'icon3', 'icon4', 'icon5', 'icon6'];
  selectedAvatar: string = 'default-user';
  showOverlay = false;
  overlayVariant: 'login' | 'created' | 'sent' = 'created';

  draftUser!: User;

  constructor(
    private router: Router,
    private draftService: SignupDraftService,
    private firestore: Firestore,
    private auth: Auth
  ) { }

  ngOnInit(): void {
    this.loadDraft();
  }

  selectAvatar(avatar: string): void {
    this.selectedAvatar = avatar;
  }

  onBackClick(): void {
    this.clearDraftIfSignupRoute();
    this.router.navigate(['/signup']);
  }

  async register(): Promise<void> {
    if (!this.draftUser) {
      this.router.navigate(['/signup']);
      return;
    }

    this.updateDraftWithAvatar();
    await this.createUserWithAuthAndFirestore();
    this.showSuccessOverlayAndNavigate();
  }

  private loadDraft(): void {
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

  private updateDraftWithAvatar(): void {
    this.draftUser.img = this.selectedAvatar;
  }

  private async createUserWithAuthAndFirestore(): Promise<void> {
    try {
      const cred = await createUserWithEmailAndPassword(
        this.auth,
        this.draftUser.email,
        this.draftUser.password
      );

      const uid = cred.user.uid;
      await setDoc(doc(this.firestore, 'users', uid), {
        name: this.draftUser.name,
        email: this.draftUser.email,
        img: this.draftUser.img,
        createdAt: serverTimestamp(),
        lastSeen: serverTimestamp(),
        presence: 'offline'
      });
    } catch (err) {
      this.showOverlay = false;
      console.error('Fehler beim Registrieren:', err);
      throw err;
    }
  }

  private showSuccessOverlayAndNavigate(): void {
    this.showOverlay = true;
    this.overlayVariant = 'created';
    setTimeout(() => {
      this.draftService.clear();
      this.showOverlay = false;
      this.router.navigate(['/']);
    }, 1500);
  }

  private clearDraftIfSignupRoute(): void {
    if (this.router.url.startsWith('/signup')) {
      this.draftService.clear();
    }
  }
}
