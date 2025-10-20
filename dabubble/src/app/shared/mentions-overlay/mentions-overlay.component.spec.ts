import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MentionsOverlayComponent } from './mentions-overlay.component';

describe('MentionsOverlayComponent', () => {
  let component: MentionsOverlayComponent;
  let fixture: ComponentFixture<MentionsOverlayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MentionsOverlayComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MentionsOverlayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
