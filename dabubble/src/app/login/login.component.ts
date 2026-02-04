import { Component, inject, OnInit } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { AuthLayoutComponent } from '../shared/auth-layout/auth-layout.component';
import { Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Auth, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from '@angular/fire/auth';
import { doc, Firestore, getDoc, serverTimestamp, setDoc, updateDoc } from '@angular/fire/firestore';

@Component({
  selector: 'app-login',
  imports: [
    MatCardModule,
    MatFormFieldModule,
    MatButtonModule,
    MatInputModule,
    AuthLayoutComponent,
    RouterLink,
    ReactiveFormsModule
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent implements OnInit {

  showIntro = true;
  submitted = false;
  showOverlay = false;
  overlayVariant: 'login' | 'created' | 'sent' = 'login';


  private fb = inject(FormBuilder);
  private router = inject(Router);
  private firestore = inject(Firestore);
  auth = inject(Auth);
  googleAuthProvider = new GoogleAuthProvider();
  loginForm: FormGroup = this.createForm();

  private guestEmail = 'guest@dabubble.de';
  private guestPassword = 'guest123';

  /**
  * Lifecycle hook that runs once the component is initialized.
  * Used here to determine whether the intro animation should play.
  */
  ngOnInit(): void {
    this.checkIntroAnimation();
  }

  /** Convenience getter for the email form control. */
  get email() { return this.loginForm.get('email'); }

  /** Convenience getter for the password form control. */
  get password() { return this.loginForm.get('password'); }

  /**
  * Handles login form submission.
  * Validates the form and triggers email/password login if valid.
  */
  onSubmit(): void {
    this.submitted = true;
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }
    this.loginWithEmail();
  }

  /**
  * Logs the user in using email and password from the form.
  * Wraps Firebase auth call in the shared login handler.
  */
  async loginWithEmail(): Promise<void> {
    const { email, password } = this.loginForm.value;
    await this.login(() => signInWithEmailAndPassword(this.auth, email, password));
  }

  /**
  * Logs the user in via Google OAuth popup.
  * Ensures a Firestore user document is created if it does not exist.
  */
  async loginWithGoogle(): Promise<void> {
    await this.login(() => signInWithPopup(this.auth, this.googleAuthProvider), true);
  }

  /**
  * Logs in with predefined guest credentials.
  * Useful for demos or quick access without registration.
  */
  async loginAsGuest(): Promise<void> {
    await this.login(() => signInWithEmailAndPassword(this.auth, this.guestEmail, this.guestPassword));
  }

  /**
  * Central login handler that manages overlay state, user doc checks,
  * presence update, and navigation on success.
  * @param authFn Function that performs the Firebase auth call.
  * @param checkDoc Whether to ensure a Firestore user document exists.
  */
  private async login(authFn: () => Promise<any>, checkDoc = false): Promise<void> {
    this.showOverlay = true;
    try {
      const cred = await authFn();
      if (checkDoc) {
        await this.ensureUserDocument(cred.user);
      }
      await this.setUserPresenceOnline(cred.user.uid);
      this.navigateToMainWithDelay();
    } catch (err) {
      this.handleLoginError(err);
    }
  }

  /**
  * Ensures a Firestore user document exists for the given user.
  * Creates a minimal profile document if none is found.
  * @param user Firebase user object returned from authentication.
  */
  private async ensureUserDocument(user: any): Promise<void> {
    const userRef = doc(this.firestore, 'users', user.uid);
    const snap = await getDoc(userRef);
    if (snap.exists()) return;
    await setDoc(userRef, {
      name: user.displayName ?? 'Unbekannter Nutzer',
      email: user.email,
      img: 'default-user',
      createdAt: serverTimestamp(),
      lastSeen: serverTimestamp(),
      presence: 'offline'
    });
  }

  /**
  * Marks the user as online in Firestore and updates lastSeen.
  * @param uid Unique user identifier in the users collection.
  */
  private async setUserPresenceOnline(uid: string) {
    const userRef = doc(this.firestore, 'users', uid);
    try {
      await updateDoc(userRef, {
        presence: 'online',
        lastSeen: new Date()
      });
    } catch (err) {
      console.error(`Kein User-Dokument für UID ${uid} gefunden!`, err);
    }
  }

  /**
   * Navigates to the main view after a short delay.
   * Used to keep the overlay visible briefly after successful login.
   */
  private navigateToMainWithDelay(): void {
    setTimeout(() => this.router.navigate(['/main']), 1500);
  }

  /**
  * Handles errors that occur during login.
  * Hides the overlay, marks the form as touched, and clears the password field.
  * @param err Error thrown by the authentication call.
  */
  private handleLoginError(err: unknown): void {
    this.showOverlay = false;
    this.loginForm.markAllAsTouched();
    this.loginForm.get('password')?.reset();
    console.error('Login failed:', err);
  }

  /**
   * Creates and configures the reactive login form group.
   * Applies required and email pattern validation to the controls.
   */
  private createForm(): FormGroup {
    return this.fb.group({
      email: ['', [
        Validators.required,
        Validators.pattern(/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/)
      ]],
      password: ['', Validators.required]
    });
  }

  /**
  * Checks if the intro animation was already shown using localStorage.
  * Updates the local flag and persists the state if needed.
  */
  private checkIntroAnimation(): void {
    const alreadyShown = localStorage.getItem('introShown');
    this.showIntro = !alreadyShown;
    if (!alreadyShown) {
      localStorage.setItem('introShown', 'true');
    }
  }
}
