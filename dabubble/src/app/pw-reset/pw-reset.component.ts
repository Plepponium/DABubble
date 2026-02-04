import { Component, inject } from '@angular/core';
import { AuthLayoutComponent } from '../shared/auth-layout/auth-layout.component';
import { Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { sendPasswordResetEmail } from 'firebase/auth';
import { Auth } from '@angular/fire/auth';

@Component({
  selector: 'app-pw-reset',
  imports: [AuthLayoutComponent, RouterLink, MatCardModule, ReactiveFormsModule],
  templateUrl: './pw-reset.component.html',
  styleUrl: './pw-reset.component.scss'
})
export class PwResetComponent {
  resetForm!: FormGroup;
  submitted = false;
  showOverlay = false;
  overlayVariant: 'login' | 'created' | 'sent' | 'changed' = 'sent';

  private auth = inject(Auth)
  private fb = inject(FormBuilder);
  private router = inject(Router);

  /**
  * Lifecycle hook: initializes the password reset form.
  */
  ngOnInit(): void {
    this.resetForm = this.createResetForm();
  }

  /**
  * Creates and configures the password reset form with email validation.
  * @returns Configured FormGroup with email control and validators.
  */
  private createResetForm(): FormGroup {
    return this.fb.group({
      email: ['', [
        Validators.required,
        Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)
      ]],
    });
  }

  /** Convenience getter for the email form control. */
  get email() {
    return this.resetForm.get('email');
  }

  /**
  * Handles form submission.
  * Validates the form and triggers password reset email if valid.
  */
  onSubmit(): void {
    this.submitted = true;
    if (this.resetForm.invalid) {
      this.resetForm.markAllAsTouched();
      return;
    }
    this.sendMail();
  }

  /**
  * Sends password reset email to the provided address.
  * Shows overlay and navigates to login on success.
  * @async
  */
  async sendMail(): Promise<void> {
    this.showOverlay = true;
    this.overlayVariant = 'sent';

    try {
      const email = this.getEmailFromForm();
      await this.sendPasswordResetEmail(email);
      this.navigateToLoginWithDelay();
    } catch (error) {
      this.handleResetError(error);
    }
  }

  /**
  * Retrieves the email address from the form.
  * @returns The email string entered by the user.
  */
  private getEmailFromForm(): string {
    return this.resetForm.value.email;
  }

  /**
  * Sends the password reset email via Firebase Auth.
  * @param email - The recipient email address.
  * @async
  */
  private async sendPasswordResetEmail(email: string): Promise<void> {
    await sendPasswordResetEmail(this.auth, email, {
      url: 'http://localhost:4200/password/change'
    });
  }

  /**
  * Navigates to the login page after a short delay and hides the overlay.
  */
  private navigateToLoginWithDelay(): void {
    setTimeout(() => {
      this.showOverlay = false;
      this.router.navigate(['/']);
    }, 1500);
  }

  /**
  * Handles errors that occur during password reset email sending.
  * @param error - The error object thrown during the operation.
  */
  private handleResetError(error: unknown): void {
    console.error('Password reset email failed:', error);
  }
}