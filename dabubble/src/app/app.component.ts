import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Auth, onAuthStateChanged } from '@angular/fire/auth';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [CommonModule, RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'dabubble';

  // private auth = inject(Auth);
  // loading = true;  // ← STARTET mit Loading = true
  
  // ngOnInit() {
  //   // Warte bis Firebase Auth geladen hat
  //   onAuthStateChanged(this.auth, () => {
  //     this.loading = false;
  //   });
  // }
}
