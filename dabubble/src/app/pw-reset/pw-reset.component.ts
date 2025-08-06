import { Component } from '@angular/core';
import { AuthLayoutComponent } from '../shared/auth-layout/auth-layout.component';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-pw-reset',
  imports: [AuthLayoutComponent, RouterLink, MatCardModule],
  templateUrl: './pw-reset.component.html',
  styleUrl: './pw-reset.component.scss'
})
export class PwResetComponent {

}
