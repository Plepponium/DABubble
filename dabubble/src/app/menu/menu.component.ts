import {ChangeDetectionStrategy, Component, signal} from '@angular/core';
import {MatExpansionModule} from '@angular/material/expansion';

@Component({
  selector: 'app-menu',
  imports: [MatExpansionModule],
  templateUrl: './menu.component.html',
  styleUrl: './menu.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MenuComponent {
  readonly panelOpenState = signal(false);
}
