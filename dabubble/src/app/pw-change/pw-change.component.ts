import { Component, inject, OnInit } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthLayoutComponent } from '../shared/auth-layout/auth-layout.component';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, ValidationErrors } from '@angular/forms';
import { Auth, getAuth } from '@angular/fire/auth';
import { confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';
import { takeUntil } from 'rxjs/internal/operators/takeUntil';
import { UserService } from '../../services/user.service';
import { LogoutService } from '../../services/logout.service';

@Component({
  selector: 'app-pw-change',
  imports: [AuthLayoutComponent, RouterLink, MatCardModule, ReactiveFormsModule],
  templateUrl: './pw-change.component.html',
  styleUrl: './pw-change.component.scss'
})
export class PwChangeComponent implements OnInit {
  changeForm!: FormGroup;
  submitted = false;
  passwordVisible = false;
  confirmVisible = false;
  showOverlay = false;
  overlayVariant: 'login' | 'created' | 'sent' | 'changed' = 'changed';
  oobCode = '';
  isResetMode = false;

  private logoutService = inject(LogoutService);
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private auth = inject(Auth);
  private destroy$ = this.logoutService.logout$;


  /**
  * Lifecycle hook: initializes form and detects reset mode from query params.
  */
  ngOnInit(): void {
    this.changeForm = this.createPasswordForm();
    this.detectResetMode();
  }

  /**
  * Creates and configures the password change form with validators.
  * @returns Configured FormGroup with password and passwordConfirm controls.
  */
  private createPasswordForm(): FormGroup {
    return this.fb.group({
      password: this.fb.control('', [Validators.required, Validators.minLength(8)]),
      passwordConfirm: this.fb.control('', Validators.required),
    }, { validators: this.passwordsMatchValidator });
  }

  /**
  * Validates that password and passwordConfirm fields match.
  * @param group - FormGroup containing password controls.
  * @returns Validation error object or null if passwords match.
  */
  private passwordsMatchValidator(group: FormGroup): ValidationErrors | null {
    const password = group.get('password')?.value;
    const passwordConfirm = group.get('passwordConfirm')?.value;
    return password === passwordConfirm ? null : { passwordMismatch: true };
  }

  /**
  * Subscribes to route query parameters to extract oobCode and determine reset mode.
  */
  private detectResetMode(): void {
    this.route.queryParams.pipe(
      takeUntil(this.destroy$)
    ).subscribe(params => {
      this.oobCode = params['oobCode'] || '';
      this.isResetMode = !!this.oobCode;
    });
  }

  /** Convenience getter for the password form control. */
  get password() {
    return this.changeForm.get('password');
  }

  /** Convenience getter for the passwordConfirm form control. */
  get passwordConfirm() {
    return this.changeForm.get('passwordConfirm');
  }

  /**
  * Toggles visibility of password or confirm password field.
  * @param field - Specifies which field's visibility to toggle.
  */
  togglePassword(field: 'password' | 'confirm'): void {
    if (field === 'password') {
      this.passwordVisible = !this.passwordVisible;
    } else {
      this.confirmVisible = !this.confirmVisible;
    }
  }

  /**
  * Handles form submission.
  * Validates the form and triggers password change if valid.
  */
  onSubmit(): void {
    this.submitted = true;
    if (this.changeForm.invalid) {
      this.changeForm.markAllAsTouched();
      return;
    }
    this.changePassword();
  }

  /**
  * Executes password change or reset based on current mode.
  * Shows overlay and navigates to login on success.
  * @async
  */
  async changePassword(): Promise<void> {
    this.showOverlay = true;
    this.overlayVariant = 'changed';

    try {
      const newPassword = this.getNewPassword();
      await this.executePasswordChange(newPassword);
      this.navigateToLoginWithDelay();
    } catch (error) {
      this.handlePasswordChangeError(error);
    }
  }

  /**
  * Retrieves the new password from the form.
  * @returns The password string entered by the user.
  */
  private getNewPassword(): string {
    return this.changeForm.value.password;
  }

  /**
  * Performs the password change or reset operation based on mode.
  * @param newPassword - The new password to set.
  * @async
  */
  private async executePasswordChange(newPassword: string): Promise<void> {
    if (this.isResetMode && this.oobCode) {
      await this.resetPasswordViaCode(this.auth, newPassword);
    } else {
      console.log('Standard password change (authenticated user)');
    }
  }

  /**
  * Resets password using Firebase oobCode from email link.
  * @param auth - Firebase Auth instance.
  * @param newPassword - The new password to set.
  * @async
  */
  private async resetPasswordViaCode(auth: Auth, newPassword: string): Promise<void> {
    await verifyPasswordResetCode(auth, this.oobCode);
    await confirmPasswordReset(auth, this.oobCode, newPassword);
  }

  /**
  * Navigates to the login page after a short delay.
  */
  private navigateToLoginWithDelay(): void {
    setTimeout(() => this.router.navigate(['/']), 1500);
  }

  /**
  * Handles errors that occur during password change.
  * @param error - The error object thrown during the operation.
  */
  private handlePasswordChangeError(error: unknown): void {
    console.error('Password change failed:', error);
  }

}
