import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DirectMessageChatsComponent } from './direct-message-chats.component';

describe('DirectMessageChatsComponent', () => {
  let component: DirectMessageChatsComponent;
  let fixture: ComponentFixture<DirectMessageChatsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DirectMessageChatsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DirectMessageChatsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
