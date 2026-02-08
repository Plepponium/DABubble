import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthLayoutComponent } from '../shared/auth-layout/auth-layout.component';
import { CommonModule } from '@angular/common';
import { SignupDraftService } from '../../services/signup-draft.service';
import { User } from '../../models/user.class';

import { Auth, createUserWithEmailAndPassword, UserCredential } from '@angular/fire/auth';
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

  private router = inject(Router);
  private draftService = inject(SignupDraftService);
  private firestore = inject(Firestore);
  private auth = inject(Auth);

  /**
  * Loads draft user from service; redirects if missing or invalid.
  */
  ngOnInit(): void {
    this.loadDraft();
  }

  /**
  * Loads draft user; sets selectedAvatar if existing img found; redirects if no draft.
  */
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

  /**
  * Selects avatar image and updates selectedAvatar property.
  * @param avatar - The avatar image identifier to select.
  */
  selectAvatar(avatar: string): void {
    this.selectedAvatar = avatar;
  }

  /**
  * Handles back button: clears draft if on signup route, navigates to signup step.
  */
  onBackClick(): void {
    this.clearDraftIfSignupRoute();
    this.router.navigate(['/signup']);
  }

  /**
  * Orchestrates user registration process with error handling.
  * Updates avatar, shows success overlay immediately, creates auth user + Firestore doc,
  * then navigates home after animation completes.
  */
  async register(): Promise<void> {
    if (!this.draftUser) {
      this.router.navigate(['/signup']);
      return;
    }
    this.updateDraftWithAvatar();
    this.showOverlay = true;
    this.overlayVariant = 'created';

    try {
      await this.createUserWithAuthAndFirestore();
      this.showSuccessOverlayAndNavigate();
    } catch (err) {
      this.showOverlay = false;
      console.error('Fehler beim Registrieren:', err);
    }
  }

  /**
  * Updates draftUser img property with currently selected avatar.
  */
  private updateDraftWithAvatar(): void {
    this.draftUser.img = this.selectedAvatar;
  }

  /**
  * Creates auth user and saves profile to Firestore.
  */
  private async createUserWithAuthAndFirestore(): Promise<void> {
    try {
      const cred: UserCredential = await this.createAuthUser();
      await this.saveUserToFirestore(cred.user.uid);
    } catch (err) {
      this.showOverlay = false;
      console.error('Fehler beim Registrieren:', err);
      throw err;
    }
  }

  /**
  * Creates Firebase Auth user with email/password from draftUser.
  * @returns UserCredential from createUserWithEmailAndPassword.
  */
  private async createAuthUser(): Promise<UserCredential> {
    return createUserWithEmailAndPassword(
      this.auth,
      this.draftUser.email,
      this.draftUser.password
    );
  }

  /**
  * Saves user profile to Firestore 'users' collection.
  * @param uid - Firebase Auth user ID.
  */
  private async saveUserToFirestore(uid: string): Promise<void> {
    await setDoc(doc(this.firestore, 'users', uid), {
      name: this.draftUser.name,
      email: this.draftUser.email,
      img: this.draftUser.img,
      createdAt: serverTimestamp(),
      lastSeen: serverTimestamp(),
      presence: 'offline'
    });
  }

  /**
  * Keeps success overlay visible briefly, then clears draft and navigates home.
  * Uses 3000ms so the overlay is clearly visible after slideIn (1.5s).
  */
  private showSuccessOverlayAndNavigate(): void {
    setTimeout(() => {
      this.draftService.clear();
      this.showOverlay = false;
      this.router.navigate(['/']);
    }, 1500);
  }

  /**
  * Clears draft service if current URL starts with '/signup'.
  */
  private clearDraftIfSignupRoute(): void {
    if (this.router.url.startsWith('/signup')) {
      this.draftService.clear();
    }
  }
}
