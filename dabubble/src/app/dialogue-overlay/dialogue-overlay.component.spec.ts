import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogueOverlayComponent } from './dialogue-overlay.component';

describe('DialogueOverlayComponent', () => {
  let component: DialogueOverlayComponent;
  let fixture: ComponentFixture<DialogueOverlayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DialogueOverlayComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DialogueOverlayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
