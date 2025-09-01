import { Component } from '@angular/core';
import { AuthLayoutComponent } from '../shared/auth-layout/auth-layout.component';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-imprint',
  imports: [AuthLayoutComponent, RouterLink],
  templateUrl: './imprint.component.html',
  styleUrl: './imprint.component.scss'
})
export class ImprintComponent {

}
