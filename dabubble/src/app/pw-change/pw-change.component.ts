import { Component, OnInit } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthLayoutComponent } from '../shared/auth-layout/auth-layout.component';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, ValidationErrors } from '@angular/forms';
import { Auth, getAuth } from '@angular/fire/auth';
import { confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';

@Component({
  selector: 'app-pw-change',
  imports: [AuthLayoutComponent, RouterLink, MatCardModule, ReactiveFormsModule],
  templateUrl: './pw-change.component.html',
  styleUrl: './pw-change.component.scss'
})
export class PwChangeComponent implements OnInit {
  changeForm: FormGroup;
  submitted = false;
  passwordVisible = false;
  confirmVisible = false;
  showOverlay = false;
  overlayVariant: 'login' | 'created' | 'sent' | 'changed' = 'changed';

  oobCode = '';
  isResetMode = false;

  constructor(private fb: FormBuilder, private router: Router, private route: ActivatedRoute,     // ← hinzufügen
    private auth: Auth) {
    this.changeForm = this.fb.group({
      password: this.fb.control('', [Validators.required, Validators.minLength(8)]),
      passwordConfirm: this.fb.control('', Validators.required),
    }, { validators: this.passwordsMatchValidator });
  }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.oobCode = params['oobCode'] || '';
      this.isResetMode = !!this.oobCode;
    });
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


  async changePassword() {
    try {
      this.overlayVariant = 'changed';
      this.showOverlay = true;
      const newPassword = this.changeForm.value.password;
      const auth = getAuth();
      if (this.isResetMode && this.oobCode) {
        await verifyPasswordResetCode(auth, this.oobCode);
        await confirmPasswordReset(auth, this.oobCode, newPassword);
      } else {
        console.log('Normale PW-Änderung');
      }
      setTimeout(() => {
        this.router.navigate(['/']);
      }, 1500);
    } catch (error: any) {
      console.error('Fehler:', error);
    }
  }

}
