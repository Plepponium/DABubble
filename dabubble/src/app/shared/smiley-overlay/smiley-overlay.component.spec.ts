import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SmileyOverlayComponent } from './smiley-overlay.component';

describe('SmileyOverlayComponent', () => {
  let component: SmileyOverlayComponent;
  let fixture: ComponentFixture<SmileyOverlayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SmileyOverlayComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SmileyOverlayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
