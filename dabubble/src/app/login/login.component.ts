import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { AuthLayoutComponent } from '../shared/auth-layout/auth-layout.component';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-login',
  imports: [MatCardModule, MatFormFieldModule, MatButtonModule, MatInputModule, AuthLayoutComponent, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {

}
