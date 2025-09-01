import { Component } from '@angular/core';
import { AuthLayoutComponent } from '../shared/auth-layout/auth-layout.component';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-privacy',
  imports: [AuthLayoutComponent, RouterLink],
  templateUrl: './privacy.component.html',
  styleUrl: './privacy.component.scss'
})
export class PrivacyComponent {

}
