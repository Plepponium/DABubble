import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { Router, RouterLink } from '@angular/router';
import { AuthLayoutComponent } from '../shared/auth-layout/auth-layout.component';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, ValidationErrors } from '@angular/forms';

@Component({
  selector: 'app-pw-change',
  imports: [AuthLayoutComponent, RouterLink, MatCardModule, ReactiveFormsModule],
  templateUrl: './pw-change.component.html',
  styleUrl: './pw-change.component.scss'
})
export class PwChangeComponent {
  changeForm: FormGroup;
  submitted = false;

  passwordVisible = false;
  confirmVisible = false;

  showOverlay = false;
  overlayVariant: 'login' | 'created' | 'sent' | 'changed' = 'changed';

  constructor(private fb: FormBuilder, private router: Router) {
    this.changeForm = this.fb.group({
      password: this.fb.control('', [Validators.required, Validators.minLength(8)]),
      passwordConfirm: this.fb.control('', Validators.required),
    }, { validators: this.passwordsMatchValidator });
  }

  private passwordsMatchValidator(group: FormGroup): ValidationErrors | null {
    const p = group.get('password')?.value;
    const pc = group.get('passwordConfirm')?.value;
    return p === pc ? null : { passwordMismatch: true };
  }


  get password() {
    return this.changeForm.get('password');
  }

  get passwordConfirm() {
    return this.changeForm.get('passwordConfirm');
  }

  togglePassword(field: 'password' | 'confirm'): void {
    if (field === 'password') this.passwordVisible = !this.passwordVisible;
    else this.confirmVisible = !this.confirmVisible;
  }

  onSubmit(): void {
    this.submitted = true;
    if (this.changeForm.invalid) {
      this.changeForm.markAllAsTouched();
      return;
    }
    this.changePassword();
  }
  changePassword() {
    this.overlayVariant = 'changed';
    this.showOverlay = true;
    setTimeout(() => {
      this.router.navigate(['/']);
    }, 1500);
  };
}
