import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChatAddUserOverlayComponent } from './chat-add-user-overlay.component';

describe('ChatAddUserOverlayComponent', () => {
  let component: ChatAddUserOverlayComponent;
  let fixture: ComponentFixture<ChatAddUserOverlayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChatAddUserOverlayComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChatAddUserOverlayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
