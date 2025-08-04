import { Component } from '@angular/core';
import { HeaderComponent } from '../header/header.component';
import { MenuComponent } from '../menu/menu.component';
import { ChatsComponent } from '../chats/chats.component';
import { ThreadComponent } from '../thread/thread.component';

@Component({
  selector: 'app-main-page',
  imports: [HeaderComponent, MenuComponent, ChatsComponent, ThreadComponent],
  templateUrl: './main-page.component.html',
  styleUrl: './main-page.component.scss'
})
export class MainPageComponent {

}
